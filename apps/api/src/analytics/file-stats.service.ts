import { Injectable, NotFoundException } from '@nestjs/common';
import { FileEventKind, FileTarget } from '../generated/prisma/enums.js';
import { AnalyticsService } from './analytics.service.js';
import { kstDay } from './analytics.mapper.js';
import type { FileEventInput, FileTargetParams } from './dto/file-stats.dto.js';
import { FileStatsRepository } from './file-stats.repository.js';

const BOT = /bot|crawl|spider|slurp|headless|preview|lighthouse|monitor|curl|wget|python|axios|node-fetch/i;
/** 숫자는 몇 분 늦어도 괜찮으므로 짧게 캐시해 DB 부담을 줄임 */
const CACHE_MS = 60_000;
const CACHE_MAX = 2000;

export interface FileStats {
  /** 지금까지 연 사람 (하루 1회씩 센 합) */
  views: number;
  /** 오늘 연 사람 */
  today: number;
  shares: number;
}

const TARGET = { case: FileTarget.CASE, missing: FileTarget.MISSING } as const;

/** 사건 파일·실종자 카드의 열람·공유 숫자. 방문 분석과 같은 쿠키 없는 일별 해시를 씀 */
@Injectable()
export class FileStatsService {
  private cache = new Map<string, { at: number; stats: FileStats }>();

  constructor(
    private readonly repo: FileStatsRepository,
    private readonly analytics: AnalyticsService,
  ) {}

  async stats({ type, key }: FileTargetParams): Promise<FileStats> {
    const cacheKey = `${type}:${key}`;
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.stats;
    const stats = await this.repo.counts(TARGET[type], key, new Date(`${kstDay()}T00:00:00+09:00`));
    if (this.cache.size >= CACHE_MAX) this.cache.clear();
    this.cache.set(cacheKey, { at: Date.now(), stats });
    return stats;
  }

  async record({ type, key }: FileTargetParams, input: FileEventInput, ip: string, ua: string) {
    if (!ua || BOT.test(ua)) return { recorded: false };
    const target = TARGET[type];
    if (!(await this.repo.exists(target, key))) throw new NotFoundException('파일을 찾을 수 없습니다.');
    const { count } = await this.repo.record({
      target,
      targetKey: key,
      kind: FileEventKind[input.kind],
      channel: input.kind === 'SHARE' ? (input.channel ?? 'link') : null,
      visitorHash: this.analytics.visitorHash(ip, ua, kstDay()),
    });
    if (count > 0) this.cache.delete(`${type}:${key}`);
    return { recorded: count > 0 };
  }
}
