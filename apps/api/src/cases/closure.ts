import type { Prisma } from '../generated/prisma/client.js';
import { CaseStatus } from '../generated/prisma/enums.js';

/**
 * 끝난 사건(SOLVED)을 화면에서 둘로 나눔. '해결'은 좋게 마무리됐다는 인상을 줘서 쓰지 않음.
 * - VERDICT(판결 확정): 가해자 판결 가운데 확정(isFinal)된 것이 있음
 * - CLOSED(수사 종결): 확정 판결 없이 끝남 (가해자 사망 등)
 * DB에는 따로 저장하지 않고 판결 자료로 계산함
 */
export const CaseClosure = { VERDICT: 'VERDICT', CLOSED: 'CLOSED' } as const;
export type CaseClosure = (typeof CaseClosure)[keyof typeof CaseClosure];

/** 확정 판결이 하나라도 있는 사건 */
export const hasFinalSentenceWhere = {
  suspects: { some: { sentences: { some: { isFinal: true } } } },
} satisfies Prisma.CaseWhereInput;

/** 목록 조회에 붙이는 칸: 확정 판결이 있는 가해자 하나만 가져와 있는지 봄 */
export const closureSelect = {
  suspects: { where: { sentences: { some: { isFinal: true } } }, select: { id: true }, take: 1 },
} satisfies Prisma.CaseSelect;

export function closureOf(status: CaseStatus, hasFinalSentence: boolean): CaseClosure | null {
  if (status !== CaseStatus.SOLVED) return null;
  return hasFinalSentence ? CaseClosure.VERDICT : CaseClosure.CLOSED;
}

/** closureSelect로 가져온 행에서 suspects를 빼고 closure를 붙임 */
export function withClosure<T extends { status: CaseStatus; suspects: unknown[] }>({ suspects, ...row }: T) {
  return { ...row, closure: closureOf(row.status, suspects.length > 0) };
}

/** 목록 필터: 판결 확정 / 수사 종결 */
export function closureWhere(closure: CaseClosure | undefined): Prisma.CaseWhereInput {
  if (!closure) return {};
  return closure === CaseClosure.VERDICT
    ? { status: CaseStatus.SOLVED, ...hasFinalSentenceWhere }
    : { status: CaseStatus.SOLVED, NOT: hasFinalSentenceWhere };
}
