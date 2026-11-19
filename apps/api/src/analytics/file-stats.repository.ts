import { Injectable } from '@nestjs/common';
import { FileEventKind, FileTarget } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class FileStatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 공개 사건이거나 실종자 목록에 있는 대상만 기록 (아무 문자열로 행이 쌓이지 않게) */
  async exists(target: FileTarget, key: string) {
    if (target === FileTarget.CASE) {
      return !!(await this.prisma.case.findFirst({ where: { slug: key, isPublished: true }, select: { id: true } }));
    }
    return !!(await this.prisma.missingPerson.findUnique({ where: { id: key }, select: { id: true } }));
  }

  /** 같은 사람이 같은 날 여러 번 열거나 공유해도 1번만 셈 (유니크 키 충돌은 무시) */
  record(data: { target: FileTarget; targetKey: string; kind: FileEventKind; channel: string | null; visitorHash: string }) {
    return this.prisma.fileEvent.createMany({ data: [data], skipDuplicates: true });
  }

  async counts(target: FileTarget, key: string, todayStart: Date) {
    const rows = await this.prisma.$queryRaw<{ views: number; today: number; shares: number }[]>`
      SELECT count(*) FILTER (WHERE kind = 'VIEW')::int AS views,
             count(*) FILTER (WHERE kind = 'VIEW' AND created_at >= ${todayStart})::int AS today,
             count(*) FILTER (WHERE kind = 'SHARE')::int AS shares
      FROM file_events
      WHERE target = ${target}::"FileTarget" AND target_key = ${key}`;
    return rows[0] ?? { views: 0, today: 0, shares: 0 };
  }
}
