import { Injectable } from '@nestjs/common';
import { UserContentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

const cloudSelect = { id: true, body: true, nickname: true, posX: true, posZ: true, createdAt: true } as const;

@Injectable()
export class CloudsRepository {
  constructor(readonly prisma: PrismaService) {}

  countPublished() {
    return this.prisma.cloudMessage.count({ where: { status: UserContentStatus.PUBLISHED } });
  }

  findRecentPublished(take: number) {
    return this.prisma.cloudMessage.findMany({
      where: { status: UserContentStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      take,
      select: cloudSelect,
    });
  }

  /** 내가 남겼지만 아직 확인 중(HELD)인 구름 */
  findMyHeld(voterId: string, take: number) {
    return this.prisma.cloudMessage.findMany({
      where: { voterId, status: UserContentStatus.HELD },
      orderBy: { createdAt: 'desc' },
      take,
      select: cloudSelect,
    });
  }

  countSince(voterId: string, since: Date) {
    return this.prisma.cloudMessage.count({ where: { voterId, createdAt: { gte: since } } });
  }

  create(data: {
    voterId: string;
    body: string;
    nickname?: string;
    status: UserContentStatus;
    category: string;
    posX?: number;
    posZ?: number;
  }) {
    return this.prisma.cloudMessage.create({
      data,
      select: { ...cloudSelect, status: true },
    });
  }

  findHeldIn(categories: string[], take: number) {
    return this.prisma.cloudMessage.findMany({
      where: { status: UserContentStatus.HELD, category: { in: categories } },
      orderBy: { createdAt: 'asc' },
      take,
      select: { id: true, body: true, nickname: true },
    });
  }

  updateModeration(id: string, status: UserContentStatus, category: string) {
    return this.prisma.cloudMessage.update({ where: { id }, data: { status, category } });
  }
}
