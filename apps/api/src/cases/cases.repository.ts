import { Injectable } from '@nestjs/common';
import { CaseReviewStatus, NewsStatus } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListCasesQuery } from './dto/cases.dto.js';

const byOrder = { sortOrder: 'asc' } as const;

const caseListSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  country: true,
  category: true,
  status: true,
  location: true,
  occurredAt: true,
  occurredAtPrecision: true,
  isPublished: true,
  reviewStatus: true,
} satisfies Prisma.CaseSelect;

const caseDetailInclude = {
  timeline: {
    orderBy: [{ occurredAt: { sort: 'asc', nulls: 'last' } }, byOrder],
  },
  suspects: {
    omit: { nameExceptionReason: true, nameExceptionDecidedAt: true },
    orderBy: byOrder,
    include: { sentences: { orderBy: { decidedAt: 'asc' } } },
  },
  victims: { orderBy: byOrder },
  unsolvedQuestions: { orderBy: byOrder },
  suspiciousCircumstances: { orderBy: byOrder },
  newsItems: {
    where: { status: NewsStatus.PUBLISHED },
    orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
    take: 5,
    select: { id: true, url: true, title: true, titleKo: true, publisher: true, publishedAt: true },
  },
} satisfies Prisma.CaseInclude;

@Injectable()
export class CasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 커서 페이지네이션. 다음 페이지 유무를 알려고 take + 1개를 가져옴 */
  findPage(query: ListCasesQuery, preview: boolean) {
    const { cursor, take } = query;
    return this.prisma.case.findMany({
      where: listWhere(query, preview),
      select: caseListSelect,
      orderBy: [{ occurredAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
  }

  findVisibleBySlug(slug: string, preview: boolean) {
    return this.prisma.case.findFirst({
      where: { slug, ...visibilityWhere(preview) },
      omit: { reviewNote: true },
      include: caseDetailInclude,
    });
  }
}

export type CaseListRow = Prisma.CaseGetPayload<{ select: typeof caseListSelect }>;
export type CaseDetailRow = NonNullable<
  Awaited<ReturnType<CasesRepository['findVisibleBySlug']>>
>;

/** 미리보기에서도 반려된 사건은 보여주지 않음 */
function visibilityWhere(preview: boolean): Prisma.CaseWhereInput {
  return preview
    ? { reviewStatus: { not: CaseReviewStatus.REJECTED } }
    : { isPublished: true };
}

/**
 * 검색 조건 조립.
 * - q: 제목·요약·지역에 부분 일치 (ILIKE '%q%'). 선두 와일드카드라 B-Tree 인덱스를 못 탐 →
 *   데이터가 수천 건 이상이 되면 pg_trgm GIN 인덱스나 전문 검색(tsvector)으로 전환할 것
 * - yearFrom/yearTo: 발생일 범위. occurred_at은 date 컬럼이라 UTC 자정 기준으로 비교함
 */
function listWhere(
  { q, country, category, status, yearFrom, yearTo }: ListCasesQuery,
  preview: boolean,
): Prisma.CaseWhereInput {
  const where: Prisma.CaseWhereInput = {
    ...visibilityWhere(preview),
    country,
    category,
    status,
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (yearFrom || yearTo) {
    where.occurredAt = {
      ...(yearFrom && { gte: new Date(Date.UTC(yearFrom, 0, 1)) }),
      ...(yearTo && { lt: new Date(Date.UTC(yearTo + 1, 0, 1)) }),
    };
  }

  return where;
}
