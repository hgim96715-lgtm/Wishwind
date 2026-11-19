import { SentenceVoteChoice, SentenceVoteDirection } from '../generated/prisma/enums.js';

export type VoteTally = { agree: number; disagree: number; tooLenient: number; tooHarsh: number };
type VoteGroup = {
  sentenceId: string;
  choice: SentenceVoteChoice;
  direction: SentenceVoteDirection | null;
  _count: number;
};

const empty = (): VoteTally => ({ agree: 0, disagree: 0, tooLenient: 0, tooHarsh: 0 });
export const voteTotal = (t: VoteTally) => t.agree + t.disagree;

/** groupBy 결과를 판결별 찬반·방향 합계로 묶음 */
export function tallyVotes(groups: VoteGroup[]) {
  const bySentence = new Map<string, VoteTally>();
  for (const g of groups) {
    const row = bySentence.get(g.sentenceId) ?? empty();
    if (g.choice === SentenceVoteChoice.AGREE) row.agree += g._count;
    else row.disagree += g._count;
    if (g.direction === SentenceVoteDirection.TOO_LENIENT) row.tooLenient += g._count;
    if (g.direction === SentenceVoteDirection.TOO_HARSH) row.tooHarsh += g._count;
    bySentence.set(g.sentenceId, row);
  }
  return bySentence;
}

/** 투표가 많은 판결 id부터 */
export function topSentenceIds(tally: Map<string, VoteTally>, limit: number) {
  return [...tally.entries()]
    .sort(([, a], [, b]) => voteTotal(b) - voteTotal(a))
    .slice(0, limit)
    .map(([id]) => id);
}

/** groupBy(_count) 결과를 많은 순 { key, count } 목록으로 */
export function countRows<K extends string>(rows: ({ _count: number } & Record<K, unknown>)[], key: K) {
  return rows.map((r) => ({ key: r[key] as string, count: r._count })).sort((a, b) => b.count - a.count);
}

/** 비공개 사건에 연결된 기사는 사건 링크를 빼고 내보냄 */
export function toPublicNews<T extends { case: { slug: string; title: string; isPublished: boolean } | null }>({
  case: c,
  ...n
}: T) {
  return { ...n, case: c?.isPublished ? { slug: c.slug, title: c.title } : null };
}
