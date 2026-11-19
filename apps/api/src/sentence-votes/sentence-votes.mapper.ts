import { SentenceVoteChoice, SentenceVoteDirection } from '../generated/prisma/enums.js';

type Group = { choice: SentenceVoteChoice; direction: SentenceVoteDirection | null; _count: { _all: number } };

/** 내 투표 + 전체 집계. 투표하지 않은 사람에게는 집계를 주지 않음 (repository 호출 전에 service가 판단) */
export function toVoteSummary(
  mine: { choice: SentenceVoteChoice; direction: SentenceVoteDirection | null },
  groups: Group[],
) {
  const sum = (matches: (g: Group) => boolean) => groups.filter(matches).reduce((n, g) => n + g._count._all, 0);
  const agree = sum((g) => g.choice === SentenceVoteChoice.AGREE);
  const disagree = sum((g) => g.choice === SentenceVoteChoice.DISAGREE);
  return {
    choice: mine.choice,
    direction: mine.direction,
    results: {
      agree,
      disagree,
      total: agree + disagree,
      tooLenient: sum((g) => g.direction === SentenceVoteDirection.TOO_LENIENT),
      tooHarsh: sum((g) => g.direction === SentenceVoteDirection.TOO_HARSH),
    },
  };
}

export const NO_VOTE = { choice: null, direction: null, results: null } as const;
