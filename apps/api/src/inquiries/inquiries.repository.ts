import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { InquiryKind } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** 문의한 사람에게 보여 주는 필드 (voterId 제외) */
const mineSelect = {
  id: true,
  kind: true,
  status: true,
  body: true,
  caseSlug: true,
  reply: true,
  repliedAt: true,
  seenAt: true,
  createdAt: true,
} as const satisfies Prisma.InquirySelect;

@Injectable()
export class InquiriesRepository {
  constructor(readonly prisma: PrismaService) {}

  countSince(voterId: string, since: Date) {
    return this.prisma.inquiry.count({ where: { voterId, createdAt: { gte: since } } });
  }

  create(data: Prisma.InquiryUncheckedCreateInput) {
    return this.prisma.inquiry.create({ data });
  }

  listMine(voterId: string) {
    return this.prisma.inquiry.findMany({
      where: { voterId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: mineSelect,
    });
  }

  listByKinds(kinds: InquiryKind[], status: Prisma.InquiryWhereInput['status']) {
    return this.prisma.inquiry.findMany({
      where: { kind: { in: kinds }, status },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  countByStatus(kinds: InquiryKind[]) {
    return this.prisma.inquiry.groupBy({ by: ['status'], where: { kind: { in: kinds } }, _count: true });
  }

  exists(id: string) {
    return this.prisma.inquiry.findUnique({ where: { id }, select: { id: true } });
  }

  findMine(id: string, voterId: string) {
    return this.prisma.inquiry.findFirst({
      where: { id, voterId },
      select: { id: true, status: true, reply: true, seenAt: true },
    });
  }

  deleteMine(id: string, voterId: string) {
    return this.prisma.inquiry.deleteMany({ where: { id, voterId } });
  }

  /** 관리실 목록에 처음 보인 글을 '관리자가 봄'으로 표시 */
  markSeen(ids: string[]) {
    return this.prisma.inquiry.updateMany({ where: { id: { in: ids }, seenAt: null }, data: { seenAt: new Date() } });
  }

  update(id: string, data: Prisma.InquiryUpdateInput) {
    return this.prisma.inquiry.update({ where: { id }, data });
  }
}
