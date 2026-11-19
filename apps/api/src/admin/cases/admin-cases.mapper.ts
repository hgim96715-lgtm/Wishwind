import type { CaseReviewStatus, CaseStatus } from '../../generated/prisma/enums.js';
import type { AdminCaseRowRecord } from './admin-cases.repository.js';

export const STATUS_LABEL: Record<CaseStatus, string> = {
  UNSOLVED: '미제',
  IN_PROGRESS: '수사·재판 진행 중',
  SOLVED: '해결',
};

export function toAdminCaseRow({ _count, ...c }: AdminCaseRowRecord) {
  return { ...c, sourceCount: _count.sources };
}

export function toReviewCounts(
  rows: { reviewStatus: CaseReviewStatus; isPublished: boolean; _count: number }[],
) {
  return rows.map((c) => ({ reviewStatus: c.reviewStatus, isPublished: c.isPublished, count: c._count }));
}

export function statusChangedDraft(title: string, before: CaseStatus, after: CaseStatus) {
  return {
    title: `‘${title}’ 사건이 ${STATUS_LABEL[after]}(으)로 바뀌었습니다`,
    body: `‘${title}’ 사건의 상태가 ${STATUS_LABEL[before]}에서 ${STATUS_LABEL[after]}(으)로 바뀌었습니다. 자세한 내용은 사건 파일에서 확인할 수 있습니다.`,
  };
}

export function newCaseDraft(title: string) {
  return {
    title: `새 사건 파일: ${title}`,
    body: `‘${title}’ 사건 기록이 사건방에 새로 추가되었습니다.`,
  };
}
