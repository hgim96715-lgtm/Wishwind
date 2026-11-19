import { Injectable } from '@nestjs/common';
import type { Db } from '../common/prisma/db.js';
import {
  BriefingKind,
  BriefingStatus,
  CaseReviewStatus,
  NewsStatus,
} from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const newsRowSelect = {
  id: true,
  url: true,
  title: true,
  titleKo: true,
  publisher: true,
  region: true,
  lang: true,
  publishedAt: true,
  caseId: true,
} as const satisfies Prisma.NewsItemSelect;
export type NewsRow = Prisma.NewsItemGetPayload<{ select: typeof newsRowSelect }>;

/** news_items와, 기사를 사건에 붙일 때 건드리는 사건 쪽 테이블 */
@Injectable()
export class NewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(run);
  }

  // ---- 기사 ----

  listByStatus(status: NewsStatus, region: Prisma.NewsItemWhereInput['region']) {
    return this.prisma.newsItem.findMany({
      where: { status, region },
      orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: 200,
      include: { case: { select: { slug: true, title: true } } },
    });
  }

  countByStatus(region: Prisma.NewsItemWhereInput['region']) {
    return this.prisma.newsItem.groupBy({ by: ['status'], where: { region }, _count: true });
  }

  findRow(id: string) {
    return this.prisma.newsItem.findUnique({ where: { id }, select: newsRowSelect });
  }

  update(id: string, data: Prisma.NewsItemUncheckedUpdateInput, db: Db = this.prisma) {
    return db.newsItem.update({ where: { id }, data });
  }

  dismissAllNew() {
    return this.prisma.newsItem.updateMany({
      where: { status: NewsStatus.NEW },
      data: { status: NewsStatus.DISMISSED, reviewedAt: new Date() },
    });
  }

  recentTitles(days: number) {
    return this.prisma.newsItem.findMany({
      where: { createdAt: { gte: new Date(Date.now() - days * DAY_MS) } },
      select: { title: true },
    });
  }

  createMany(data: Prisma.NewsItemCreateManyInput[]) {
    return this.prisma.newsItem.createMany({ data, skipDuplicates: true });
  }

  untranslatedForeign(limit: number) {
    return this.prisma.newsItem.findMany({
      where: { status: NewsStatus.NEW, lang: { not: 'ko' }, titleKo: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, title: true, lang: true },
    });
  }

  // ---- 사건 쪽 ----

  /** 기사 제목과 비교할 사건 후보 (반려된 사건 제외) */
  caseCandidates() {
    return this.prisma.case.findMany({
      where: { reviewStatus: { not: CaseReviewStatus.REJECTED } },
      select: { id: true, title: true, status: true, isPublished: true },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
  }

  findCaseForAttach(caseId: string, db: Db) {
    return db.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        title: true,
        isPublished: true,
        timeline: { select: { title: true, sortOrder: true } },
      },
    });
  }

  createCase(data: Prisma.CaseUncheckedCreateInput, db: Db) {
    return db.case.create({ data, select: { id: true, slug: true, title: true } });
  }

  updateCase(caseId: string, data: Prisma.CaseUncheckedUpdateInput, db: Db) {
    return db.case.update({ where: { id: caseId }, data });
  }

  upsertSource(caseId: string, url: string, create: Omit<Prisma.CaseSourceUncheckedCreateInput, 'caseId' | 'url'>, db: Db) {
    return db.caseSource.upsert({
      where: { caseId_url: { caseId, url } },
      create: { ...create, caseId, url },
      update: {},
    });
  }

  createTimelineEvent(data: Prisma.TimelineEventUncheckedCreateInput, db: Db) {
    return db.timelineEvent.create({ data });
  }

  createCaseUpdateDraft(caseId: string, title: string, body: string, db: Db) {
    return db.briefingPost.create({
      data: { kind: BriefingKind.CASE_UPDATE, status: BriefingStatus.DRAFT, caseId, title, body },
    });
  }
}
