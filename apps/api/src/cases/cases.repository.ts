import { Injectable } from '@nestjs/common';
import { CaseReviewStatus, Country, NewsStatus, RelatedKind } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListCasesQuery } from './dto/cases.dto.js';
import { HIDE_NAME_STATUSES } from './public-suspect.js';
import { closureSelect, closureWhere } from './closure.js';

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
  ...closureSelect,
} satisfies Prisma.CaseSelect;

/** 사건이 바꾼 것(법·기념일·제도)에서 화면에 내보내는 칸 */
const changeSelect = {
  id: true,
  kind: true,
  name: true,
  year: true,
  observedOn: true,
  country: true,
  description: true,
  sourceUrl: true,
  sourceTitle: true,
} satisfies Prisma.CaseChangeSelect;

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
  changes: {
    orderBy: [{ year: { sort: 'asc', nulls: 'last' } }, byOrder],
    select: changeSelect,
  },
  relatedContents: {
    orderBy: [{ kind: 'asc' }, byOrder],
    select: {
      id: true,
      kind: true,
      title: true,
      platform: true,
      creator: true,
      url: true,
      releaseYear: true,
      language: true,
      note: true,
      isDramatized: true,
    },
  },
  sources: {
    orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'asc' }],
    select: { id: true, url: true, title: true, publisher: true, type: true, publishedAt: true },
  },
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
  async findPage(query: ListCasesQuery, preview: boolean) {
    const { cursor, take } = query;
    const where = listWhere(query, preview);
    if (query.q) {
      const matches = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT c.id FROM cases c
        WHERE strpos(lower(regexp_replace(c.title, '[[:space:]]', '', 'g')), ${compactSearch(query.q)}) > 0
           OR strpos(lower(regexp_replace(c.summary, '[[:space:]]', '', 'g')), ${compactSearch(query.q)}) > 0
           OR strpos(lower(regexp_replace(c.location, '[[:space:]]', '', 'g')), ${compactSearch(query.q)}) > 0
           OR EXISTS (
             SELECT 1 FROM related_contents rc WHERE rc.case_id = c.id
               AND (strpos(lower(regexp_replace(rc.title, '[[:space:]]', '', 'g')), ${compactSearch(query.q)}) > 0
                 OR strpos(lower(regexp_replace(rc.platform, '[[:space:]]', '', 'g')), ${compactSearch(query.q)}) > 0)
           )
           OR EXISTS (
             SELECT 1 FROM suspects s WHERE s.case_id = c.id
               AND s.status::text NOT IN (${Prisma.join([...HIDE_NAME_STATUSES])})
               AND strpos(lower(regexp_replace(s.name, '[[:space:]]', '', 'g')), ${compactSearch(query.q)}) > 0
           )
      `);
      where.id = { in: matches.map(row => row.id) };
    }
    return this.prisma.case.findMany({
      where,
      select: caseListSelect,
      orderBy: [{ occurredAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
  }

  /** 관리실에서 사건방 '오늘의 사건 파일'로 고정한 사건 */
  findFilePicks(preview: boolean) {
    return this.prisma.case.findMany({
      where: { ...visibilityWhere(preview), isFilePick: true },
      select: caseListSelect,
      orderBy: { updatedAt: 'desc' },
      take: 3,
    });
  }

  /** 다큐·방송·영화 등으로 다뤄진 공개 사건 (책 제외). 사건방 맨 위 '영상으로 본 사건'용, 최근 갱신순 */
  findMediaCases(preview: boolean, take = 100) {
    const mediaWhere = { kind: { not: 'BOOK' as const } };
    return this.prisma.case.findMany({
      where: { ...visibilityWhere(preview), relatedContents: { some: mediaWhere } },
      select: {
        ...caseListSelect,
        relatedContents: { where: mediaWhere, orderBy: { sortOrder: 'asc' }, take: 2, select: { kind: true, platform: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  /** 관리실에서 홈 대표로 지정한 사건 */
  findHomeFeatured(preview: boolean) {
    return this.prisma.case.findMany({
      where: { ...visibilityWhere(preview), isHomeFeatured: true },
      select: caseListSelect,
      orderBy: { updatedAt: 'desc' },
      take: 3,
    });
  }

  /** 최근 인스타 릴스에서 다룬 공개 사건 (관리실 '인스타 성과'에 사건 주소를 적어 둔 것). 최근 올린 순 */
  async findReelCases(preview: boolean, take = 6) {
    const posts = await this.prisma.instagramPost.findMany({
      where: { kind: 'REEL', caseSlug: { not: null } },
      orderBy: { postedOn: 'desc' },
      take: 20,
      select: { caseSlug: true },
    });
    const slugs = [...new Set(posts.flatMap((p) => p.caseSlug ?? []))];
    if (slugs.length === 0) return [];
    const rows = await this.prisma.case.findMany({
      where: { ...visibilityWhere(preview), slug: { in: slugs } },
      select: caseListSelect,
    });
    return slugs.flatMap((slug) => rows.find((r) => r.slug === slug) ?? []).slice(0, take);
  }

  /** 공개 사건의 '바뀐 것' 전체 (홈 '알고 계셨나요?'·/changes). 많아야 수백 개라 한 번에 보냄 */
  findChanges(preview: boolean) {
    return this.prisma.caseChange.findMany({
      where: { case: visibilityWhere(preview) },
      orderBy: [{ year: { sort: 'asc', nulls: 'last' } }, { sortOrder: 'asc' }],
      select: { ...changeSelect, case: { select: { slug: true, title: true, country: true } } },
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
 * - q: 공백을 제거한 제목·요약·지역·공개된 가해자 이름에 부분 일치. 일반 B-Tree 인덱스를 못 탐 →
 *   데이터가 수천 건 이상이 되면 pg_trgm GIN 인덱스나 전문 검색(tsvector)으로 전환할 것
 * - yearFrom/yearTo: 발생일 범위. occurred_at은 date 컬럼이라 UTC 자정 기준으로 비교함
 */
function listWhere(
  { country, category, status, closure, related, yearFrom, yearTo }: ListCasesQuery,
  preview: boolean,
): Prisma.CaseWhereInput {
  const where: Prisma.CaseWhereInput = {
    ...visibilityWhere(preview),
    // 사건방에서 중국(CN)은 기타로 묶어 보여 주므로, 기타를 고르면 둘 다 찾음 (?country=CN도 같음)
    country: country === Country.OTHER || country === Country.CN ? { in: [Country.OTHER, Country.CN] } : country,
    category,
    status,
    ...closureWhere(closure),
    ...relatedWhere(related),
  };

  if (yearFrom || yearTo) {
    where.occurredAt = {
      ...(yearFrom && { gte: new Date(Date.UTC(yearFrom, 0, 1)) }),
      ...(yearTo && { lt: new Date(Date.UTC(yearTo + 1, 0, 1)) }),
    };
  }

  return where;
}

const platformIs = (...names: string[]) => ({
  OR: names.map((name) => ({ platform: { contains: name, mode: 'insensitive' as const } })),
});

/** 관련 콘텐츠가 있는 사건만 (종류 또는 플랫폼으로 좁힘) */
function relatedWhere(related: ListCasesQuery['related']): Prisma.CaseWhereInput {
  switch (related) {
    case undefined:
      return {};
    case 'any':
      return { relatedContents: { some: {} } };
    case 'movie':
      return { relatedContents: { some: { kind: { in: [RelatedKind.MOVIE, RelatedKind.SERIES] } } } };
    case 'documentary':
      return { relatedContents: { some: { kind: { in: [RelatedKind.DOCUMENTARY, RelatedKind.TV_PROGRAM] } } } };
    case 'youtube':
      return { relatedContents: { some: { kind: RelatedKind.YOUTUBE } } };
    case 'book':
      return { relatedContents: { some: { kind: RelatedKind.BOOK } } };
    case 'netflix':
      return { relatedContents: { some: platformIs('넷플릭스', 'netflix') } };
    case 'prime':
      return { relatedContents: { some: platformIs('프라임', 'prime') } };
    case 'disney':
      return { relatedContents: { some: platformIs('디즈니', 'disney') } };
  }
}

/** 검색어 공백을 없애 붙여 쓰기와 띄어쓰기를 동일하게 처리함. */
export function compactSearch(value: string) {
  return value.replace(/\s/gu, "").toLowerCase();
}
