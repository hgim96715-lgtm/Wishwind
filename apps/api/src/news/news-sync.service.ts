import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { PapagoTranslator } from './papago.js';
import { NewsRepository } from './news.repository.js';
import {
  EDITIONS,
  googleNewsUrl,
  type NewsRegion,
  parseGoogleNewsRss,
  titleKey,
  type NewsCandidate,
} from './google-news.js';

const FIRST_RUN_DELAY_MS = 20_000;
const TIMEOUT_MS = 15_000;
/** 검색어마다 최신 기사만 (관리실 확인 목록이 너무 길어지지 않게) */
const PER_QUERY = { KR: 20, US: 10, GB: 10, JP: 10 } as const;
/** 한 번에 번역하는 해외 제목 수 (Papago 글자 수 과금이라 상한을 둠) */
const TRANSLATE_LIMIT = 80;

/**
 * 새 기사를 모아 NEW 상태로만 저장함. 브리핑룸에는 관리자가 공개(PUBLISHED)한 것만 보임
 * (재판 중 사건 단정 금지·피해자 보호 원칙을 사람이 확인하기 위함)
 */
@Injectable()
export class NewsSyncService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(NewsSyncService.name);
  private timers: NodeJS.Timeout[] = [];
  private running = false;

  constructor(
    private readonly repo: NewsRepository,
    private readonly config: ConfigService<Env, true>,
    private readonly papago: PapagoTranslator,
  ) {}

  onApplicationBootstrap() {
    if (!this.config.get('NEWS_SYNC_ENABLED', { infer: true })) return;
    const hours = this.config.get('NEWS_SYNC_INTERVAL_HOURS', { infer: true });
    const run = () => void this.sync().catch((e: unknown) => this.logger.warn(`뉴스 수집 실패: ${String(e)}`));
    this.timers.push(setTimeout(run, FIRST_RUN_DELAY_MS));
    this.timers.push(setInterval(run, hours * 60 * 60 * 1000));
    for (const t of this.timers) t.unref();
  }

  onApplicationShutdown() {
    for (const t of this.timers) clearTimeout(t);
  }

  /** [지역, 검색어] 목록. NEWS_QUERIES는 국내 검색어만 바꿈 */
  private searches(): [NewsRegion, string][] {
    const raw = this.config.get('NEWS_QUERIES', { infer: true });
    const custom = raw?.split(',').map((q) => q.trim()).filter(Boolean);
    const kr = custom?.length ? custom : EDITIONS.KR.queries;
    const list: [NewsRegion, string][] = kr.map((q) => ['KR', q]);
    if (this.config.get('NEWS_FOREIGN_ENABLED', { infer: true })) {
      for (const region of ['US', 'GB', 'JP'] as const) {
        for (const q of EDITIONS[region].queries) list.push([region, q]);
      }
    }
    return list;
  }

  private async fetchQuery(query: string, region: NewsRegion): Promise<NewsCandidate[]> {
    const res = await fetch(googleNewsUrl(query, region), {
      headers: { 'user-agent': 'Mozilla/5.0 (cold-cases news collector)' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseGoogleNewsRss(await res.text());
  }

  async sync() {
    if (this.running) return { added: 0, skipped: 0, failedQueries: [] as string[], translated: 0 };
    this.running = true;
    try {
      const failedQueries: string[] = [];
      const found: (NewsCandidate & { query: string; region: NewsRegion; lang: string })[] = [];
      for (const [region, query] of this.searches()) {
        try {
          const items = (await this.fetchQuery(query, region)).slice(0, PER_QUERY[region]);
          for (const item of items) found.push({ ...item, query, region, lang: EDITIONS[region].lang });
        } catch (error) {
          failedQueries.push(`${region}:${query}`);
          this.logger.warn(`뉴스 검색 실패 (${query}): ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 같은 소식을 여러 언론사가 쓴 기사는 하나만 남김 (최근 7일 저장분과도 비교)
      const recent = await this.repo.recentTitles(7);
      const seen = new Set(recent.map((r) => titleKey(r.title)));
      const fresh = found
        .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
        .filter((item) => {
          const key = titleKey(item.title);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      const { count } = await this.repo.createMany(fresh);
      const translated = await this.translateMissing();
      this.logger.log(`뉴스 수집: 새 기사 ${count}건 (검색 결과 ${found.length}건, 제목 번역 ${translated}건)`);
      return { added: count, skipped: found.length - count, failedQueries, translated };
    } finally {
      this.running = false;
    }
  }

  /**
   * 확인 전(NEW)인 해외 기사 중 한국어 제목이 없는 것을 Papago로 번역해 둠.
   * 관리실 목록에서 바로 한국어로 읽고 고를 수 있게 하기 위함. 키가 없으면 아무것도 안 함
   */
  async translateMissing(limit = TRANSLATE_LIMIT) {
    if (!this.papago.isConfigured()) return 0;
    const rows = await this.repo.untranslatedForeign(limit);
    let done = 0;
    for (const row of rows) {
      const titleKo = await this.papago.toKorean(row.title, row.lang);
      if (!titleKo) continue;
      await this.repo.update(row.id, { titleKo });
      done += 1;
    }
    return done;
  }
}
