import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { MissingStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListMissingQuery } from './dto/missing.dto.js';

const listSelect = {
  id: true,
  _count: { select: { lightings: true } },
  source: true,
  name: true,
  gender: true,
  missingDate: true,
  lastSeenPlace: true,
  region: true,
  thumbUrl: true,
  // 실종자들의 정원 '사정별 길'에서 아이·어르신을 나누는 데 씀
  ageAtMissing: true,
} as const satisfies Prisma.MissingPersonSelect;

const detailSelect = {
  ...listSelect,
  ageNow: true,
  appearance: true,
  description: true,
  photoUrl: true,
  sourceUrl: true,
  lastSyncedAt: true,
} as const satisfies Prisma.MissingPersonSelect;

const ACTIVE = { status: MissingStatus.ACTIVE } as const;

@Injectable()
export class MissingRepository {
  constructor(private readonly prisma: PrismaService) {}

  lightingStats(id: string, voterId?: string) {
    return this.prisma.$transaction(async tx => ({
      count: await tx.missingLanternLighting.count({ where: { personId: id } }),
      lit: voterId ? !!(await tx.missingLanternLighting.findUnique({ where: { personId_voterId: { personId: id, voterId } } })) : false,
    }));
  }

  light(id: string, voterId: string) {
    return this.prisma.$transaction(async tx => {
      const result = await tx.missingLanternLighting.createMany({ data: [{ personId: id, voterId }], skipDuplicates: true });
      const count = await tx.missingLanternLighting.count({ where: { personId: id } });
      return { count, lit: true, added: result.count > 0 };
    });
  }

  findCursor(id: string) {
    return this.prisma.missingPerson.findUnique({
      where: { id },
      select: { id: true, missingDate: true },
    });
  }

  /** 최근 실종자 순. after는 키셋 조건(missingCursorWhere), 다음 페이지 확인용으로 take + 1 */
  findPage(q: ListMissingQuery, after: Prisma.MissingPersonWhereInput) {
    return this.prisma.missingPerson.findMany({
      where: { ...ACTIVE, region: q.region, source: q.source, ...after },
      orderBy: [{ missingDate: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
      take: q.take + 1,
      select: listSelect,
    });
  }

  countByRegion() {
    return this.prisma.missingPerson.groupBy({
      by: ['region'],
      where: ACTIVE,
      _count: { _all: true },
      orderBy: { region: 'asc' },
    });
  }

  findActive(id: string) {
    return this.prisma.missingPerson.findFirst({
      where: { id, ...ACTIVE },
      select: detailSelect,
    });
  }

  findTranslationSource(id: string) {
    return this.prisma.missingPerson.findFirst({
      where: { id, ...ACTIVE },
      select: { description: true, descriptionKo: true, descriptionKoSourceHash: true, source: true },
    });
  }

  saveTranslation(id: string, descriptionKo: string, hash: string) {
    return this.prisma.missingPerson.update({
      where: { id },
      data: { descriptionKo, descriptionKoSourceHash: hash },
    });
  }
}

export type MissingListRow = Awaited<ReturnType<MissingRepository['findPage']>>[number];
export type MissingDetailRow = NonNullable<Awaited<ReturnType<MissingRepository['findActive']>>>;

/**
 * 키셋 페이지네이션 조건: (missingDate desc nulls last, id desc) 순서에서 커서 "다음" 행만
 * Prisma 기본 cursor는 nulls last 정렬과 함께 쓰면 경계가 어긋나 같은 사람이 두 페이지에 나올 수 있음
 */
export function missingCursorWhere(c: {
  id: string;
  missingDate: Date | null;
}): Prisma.MissingPersonWhereInput {
  if (c.missingDate === null) return { missingDate: null, id: { lt: c.id } };
  return {
    OR: [
      { missingDate: { lt: c.missingDate } },
      { missingDate: c.missingDate, id: { lt: c.id } },
      { missingDate: null },
    ],
  };
}
