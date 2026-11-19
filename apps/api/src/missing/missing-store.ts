import type { PrismaClient } from '../generated/prisma/client.js';
import { MissingSource, MissingStatus } from '../generated/prisma/enums.js';
import type { MissingPersonInput } from './fbi-missing.mapper.js';

/** 한 번에 활성 인원의 절반 넘게 사라지면 원본 이상으로 보고 숨기지 않음 */
const MAX_DEACTIVATE_RATIO = 0.5;

export interface SnapshotResult {
  source: MissingSource;
  upserted: number;
  deactivated: number;
  skippedDeactivation: boolean;
}

/**
 * 한 출처의 "현재 전체 목록"을 DB에 반영함. Nest 서비스와 CLI가 같이 씀.
 * - 목록에 있는 사람: upsert + ACTIVE
 * - 목록에 없는 사람: INACTIVE (귀가 여부는 알 수 없으므로 화면에 표시하지 않음)
 * - complete=false(일부 페이지만 받은 경우)면 숨김 처리를 하지 않음
 */
export async function applySnapshot(
  prisma: PrismaClient,
  source: MissingSource,
  items: MissingPersonInput[],
  opts: { complete: boolean; startedAt?: Date },
): Promise<SnapshotResult> {
  const startedAt = opts.startedAt ?? new Date();

  for (const p of items) {
    const data = { ...p, status: MissingStatus.ACTIVE, lastSyncedAt: startedAt };
    await prisma.missingPerson.upsert({
      where: { source_externalId: { source, externalId: p.externalId } },
      create: { source, ...data },
      update: data,
    });
  }

  const staleWhere = {
    source,
    status: MissingStatus.ACTIVE,
    lastSyncedAt: { lt: startedAt },
  };
  const [staleCount, activeCount] = await Promise.all([
    prisma.missingPerson.count({ where: staleWhere }),
    prisma.missingPerson.count({ where: { source, status: MissingStatus.ACTIVE } }),
  ]);
  const skippedDeactivation =
    !opts.complete ||
    items.length === 0 ||
    staleCount > activeCount * MAX_DEACTIVATE_RATIO;

  let deactivated = 0;
  if (!skippedDeactivation && staleCount > 0) {
    ({ count: deactivated } = await prisma.missingPerson.updateMany({
      where: staleWhere,
      data: { status: MissingStatus.INACTIVE },
    }));
  }

  return {
    source,
    upserted: items.length,
    deactivated,
    skippedDeactivation: skippedDeactivation && staleCount > 0,
  };
}
