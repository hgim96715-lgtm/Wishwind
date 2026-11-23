import { CaseReviewStatus } from '../generated/prisma/enums.js';
import type { CaseDetailRow, CaseListRow } from './cases.repository.js';
import { isClueOnlySource } from '../case-import/case-import.schema.js';
import { toPublicSuspect } from './public-suspect.js';
import { closureOf, withClosure } from './closure.js';

export interface PhotoPolicy {
  countries: ReadonlySet<string>;
  baseUrl: string | undefined;
}

/** 개발 미리보기에서만 "검토 필요"·"비공개" 도장을 붙임 */
export function reviewFlags(
  preview: boolean,
  isPublished: boolean,
  reviewStatus: CaseReviewStatus,
) {
  return {
    reviewPending: preview && reviewStatus !== CaseReviewStatus.VERIFIED,
    unpublished: preview && !isPublished,
  };
}

export function toCaseListItem(
  { isPublished, reviewStatus, ...item }: CaseListRow,
  preview: boolean,
) {
  return { ...withClosure(item), ...reviewFlags(preview, isPublished, reviewStatus) };
}

export function toCasePage(rows: CaseListRow[], take: number, preview: boolean) {
  const hasNext = rows.length > take;
  const items = (hasNext ? rows.slice(0, take) : rows).map((row) =>
    toCaseListItem(row, preview),
  );
  return {
    items,
    nextCursor: hasNext ? items[items.length - 1].id : null,
  };
}

export function toCaseDetail(
  found: CaseDetailRow,
  preview: boolean,
  photo: PhotoPolicy,
) {
  const { isPublished, reviewStatus, ...detail } = found;
  return {
    ...detail,
    ...reviewFlags(preview, isPublished, reviewStatus),
    closure: closureOf(
      found.status,
      found.suspects.some((s) => s.sentences.some((x) => x.isFinal)),
    ),
    // 나무위키는 단서용이라 화면의 관련 기사 목록에는 내보내지 않음
    sources: found.sources.filter((s) => !isClueOnlySource(s.url)),
    suspects: found.suspects.map((s) =>
      toPublicSuspect(s, found.country, photo.countries, photo.baseUrl),
    ),
  };
}
