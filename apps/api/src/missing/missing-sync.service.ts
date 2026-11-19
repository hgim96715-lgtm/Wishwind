import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { MissingSource } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FbiMissingClient } from './fbi-missing.client.js';
import { mapFbiItem, type MissingPersonInput } from './fbi-missing.mapper.js';
import { applySnapshot, type SnapshotResult } from './missing-store.js';
import { Safe182Client } from './safe182.client.js';
import { mapSafe182Item } from './safe182.mapper.js';

const FIRST_RUN_DELAY_MS = 10_000;

/**
 * 출처마다 따로 돌림: FBI가 막혀도(403) 국내 데이터는 계속 들어옴.
 * 각 출처는 "전부 받은 뒤에만 DB 반영" → 중간 실패로 일부만 숨겨지는 일을 막음
 */
@Injectable()
export class MissingSyncService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(MissingSyncService.name);
  private timers: NodeJS.Timeout[] = [];
  private running = new Set<MissingSource>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly fbi: FbiMissingClient,
    private readonly safe182: Safe182Client,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onApplicationBootstrap() {
    if (!this.config.get('MISSING_SYNC_ENABLED', { infer: true })) return;
    const hours = this.config.get('MISSING_SYNC_INTERVAL_HOURS', { infer: true });
    const run = () => void this.syncAll();
    this.timers.push(setTimeout(run, FIRST_RUN_DELAY_MS));
    this.timers.push(setInterval(run, hours * 60 * 60 * 1000));
    for (const t of this.timers) t.unref();
  }

  onApplicationShutdown() {
    for (const t of this.timers) clearTimeout(t);
  }

  async syncAll() {
    await this.syncSource(MissingSource.FBI, async () => (await this.fbi.fetchAll()).map(mapFbiItem));
    if (this.safe182.isConfigured()) {
      await this.syncSource(MissingSource.SAFE182, async () =>
        (await this.safe182.fetchAll()).map(mapSafe182Item),
      );
    } else {
      this.logger.log('안전Dream 키가 없어 국내 동기화를 건너뜀');
    }
  }

  private async syncSource(
    source: MissingSource,
    fetchItems: () => Promise<MissingPersonInput[]>,
  ): Promise<SnapshotResult | null> {
    if (this.running.has(source)) return null;
    this.running.add(source);
    const startedAt = new Date();
    try {
      const items = await fetchItems();
      const result = await applySnapshot(this.prisma, source, items, { complete: true, startedAt });
      if (result.skippedDeactivation) {
        this.logger.warn(`${source}: 한 번에 너무 많이 빠져 숨김 처리를 건너뜀. 원본 확인 필요`);
      }
      this.logger.log(`${source} 동기화 완료 ${JSON.stringify(result)}`);
      return result;
    } catch (err) {
      this.logger.error(`${source} 동기화 실패: ${(err as Error).message}`);
      return null;
    } finally {
      this.running.delete(source);
    }
  }
}
