import {
  CaseStatus,
  SuspectStatus,
} from '../../generated/prisma/enums.js';

export interface StaleThresholds {
  trial: number;
  investigating: number;
  unsolved: number;
}

/** 재확인 주기(일). 재판은 변화가 잦아 가장 짧게 둠 */
export const DEFAULT_STALE_DAYS: StaleThresholds = {
  trial: 30,
  investigating: 60,
  unsolved: 180,
};

export type RecheckStage = keyof StaleThresholds;

export interface StaleCandidate {
  slug: string;
  status: CaseStatus;
  lastVerifiedAt: Date | null;
  suspects: { status: SuspectStatus; sentences: unknown[] }[];
}

export function recheckStage(candidate: StaleCandidate): RecheckStage | null {
  if (candidate.status === CaseStatus.SOLVED) return null;
  if (candidate.status === CaseStatus.UNSOLVED) return 'unsolved';
  const onTrial = candidate.suspects.some(
    (s) => s.status === SuspectStatus.INDICTED || s.sentences.length > 0,
  );
  return onTrial ? 'trial' : 'investigating';
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 기준일이 지났거나 한 번도 확인하지 않은 사건을 오래된 순서로 돌려줌 */
export function findStale(
  candidates: StaleCandidate[],
  now: Date,
  thresholds: StaleThresholds = DEFAULT_STALE_DAYS,
) {
  return candidates
    .flatMap((candidate) => {
      const stage = recheckStage(candidate);
      if (!stage) return [];
      const elapsedDays = candidate.lastVerifiedAt
        ? Math.floor((now.getTime() - candidate.lastVerifiedAt.getTime()) / DAY_MS)
        : null;
      if (elapsedDays !== null && elapsedDays < thresholds[stage]) return [];
      return [
        {
          slug: candidate.slug,
          status: candidate.status,
          stage,
          lastVerifiedAt:
            candidate.lastVerifiedAt?.toISOString().slice(0, 10) ?? '-',
          elapsedDays,
        },
      ];
    })
    .sort(
      (a, b) =>
        (b.elapsedDays ?? Number.POSITIVE_INFINITY) -
        (a.elapsedDays ?? Number.POSITIVE_INFINITY),
    );
}
