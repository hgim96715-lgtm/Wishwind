import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { BriefingKind, BriefingStatus, CaseReviewStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CaseEdit, CaseListQuery, SourceAdd } from './dto/admin-cases.dto.js';

export const adminCaseRowSelect = {
  id: true,
  slug: true,
  title: true,
  country: true,
  category: true,
  status: true,
  reviewStatus: true,
  isPublished: true,
  lastVerifiedAt: true,
  updatedAt: true,
  _count: { select: { sources: true } },
} as const satisfies Prisma.CaseSelect;
export type AdminCaseRowRecord = Prisma.CaseGetPayload<{ select: typeof adminCaseRowSelect }>;

const detailInclude = {
  sources: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      title: true,
      publisher: true,
      url: true,
      type: true,
      publishedAt: true,
      _count: { select: { claims: true } },
    },
  },
  briefingPosts: {
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, kind: true, status: true, title: true, createdAt: true },
  },
  _count: {
    select: {
      timeline: true,
      suspects: true,
      victims: true,
      unsolvedQuestions: true,
      suspiciousCircumstances: true,
      userQuestions: true,
    },
  },
} as const satisfies Prisma.CaseInclude;

@Injectable()
export class AdminCasesRepository {
  constructor(readonly prisma: PrismaService) {}

  list(query: CaseListQuery) {
    const where: Prisma.CaseWhereInput = {
      ...(query.review && { reviewStatus: query.review }),
      ...(query.published && { isPublished: query.published === 'true' }),
      ...(query.q && {
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { slug: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };
    return this.prisma.case.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: 300,
      select: adminCaseRowSelect,
    });
  }

  countByReview() {
    return this.prisma.case.groupBy({ by: ['reviewStatus', 'isPublished'], _count: true });
  }

  findDetail(id: string) {
    return this.prisma.case.findUnique({ where: { id }, include: detailInclude });
  }

  findSummary(id: string) {
    return this.prisma.case.findUnique({
      where: { id },
      select: { id: true, slug: true, title: true, status: true, isPublished: true },
    });
  }

  update(id: string, edit: CaseEdit) {
    return this.prisma.case.update({ where: { id }, data: edit });
  }

  /** 브리핑룸에 바로 공개하지 않고 초안으로 남김. 관리자가 문장을 확인한 뒤 공개함 */
  createCaseUpdateDraft(caseId: string, title: string, body: string) {
    return this.prisma.briefingPost.create({
      data: { kind: BriefingKind.CASE_UPDATE, status: BriefingStatus.DRAFT, caseId, title, body },
    });
  }

  remove(id: string) {
    return this.prisma.case.delete({ where: { id } });
  }

  findSourceByUrl(caseId: string, url: string) {
    return this.prisma.caseSource.findUnique({ where: { caseId_url: { caseId, url } }, select: { id: true } });
  }

  addSource(caseId: string, source: SourceAdd) {
    return this.prisma.$transaction([
      this.prisma.caseSource.create({
        data: {
          caseId,
          url: source.url,
          title: source.title,
          publisher: source.publisher,
          type: source.type,
          publishedAt: source.publishedAt ?? null,
          accessedAt: new Date(new Date().toISOString().slice(0, 10)),
        },
      }),
      this.invalidateReview(caseId),
    ]);
  }

  /** 지운 출처가 있으면 true */
  async removeSource(caseId: string, sourceId: string) {
    const { count } = await this.prisma.caseSource.deleteMany({ where: { id: sourceId, caseId } });
    if (count > 0) await this.invalidateReview(caseId);
    return count > 0;
  }

  /** 출처가 바뀌면 검토를 다시 해야 함 (초안은 그대로 둠) */
  private invalidateReview(caseId: string) {
    return this.prisma.case.updateMany({
      where: { id: caseId, reviewStatus: { not: CaseReviewStatus.DRAFT } },
      data: { reviewStatus: CaseReviewStatus.NEEDS_REVIEW, lastVerifiedAt: null },
    });
  }
}
