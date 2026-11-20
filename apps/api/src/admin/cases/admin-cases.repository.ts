import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { BriefingKind, BriefingStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CaseEdit, CaseListQuery } from './dto/admin-cases.dto.js';

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
}
