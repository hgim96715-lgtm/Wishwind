import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { PapagoTranslator } from './papago.js';
import { CLASSIFY_BATCH, NewsClassifier } from './news-classifier.js';
import { NewsAutoVerdict, NewsStatus } from '../generated/prisma/enums.js';
import { NewsRepository, type NewsRow } from './news.repository.js';
import { NewsAdminService } from './news-admin.service.js';
import { suggestCases, type CaseCandidate } from './case-match.js';
import { AUTO_IMPORT_NOTE } from '../case-import/inbox/inbox-import.service.js';
import { CaseCategory } from '../generated/prisma/enums.js';
import type { NewsVerdict } from './schemas/news-verdict.schema.js';
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
/** 한 번 수집에서 자동 분류하는 기사 수 상한 (API 비용 상한) */
const CLASSIFY_LIMIT = 160;
/** 한 번 수집에서 새로 만드는 사건 초안 수 상한 (관리실 확인 부담) */
const DRAFT_LIMIT = 10;

/**
 * 새 기사를 모아 NEW로 저장한 뒤, NEWS_AUTO_PUBLISH가 켜져 있으면 Claude가 제목을 분류함.
 * - PUBLISH: 바로 브리핑룸에 공개 (reviewedAt은 비워 둬 '자동 공개'로 구분)
 * - DISMISS: 사건과 무관한 기사라 숨김
 * - HOLD: 피해자 보호·단정 우려가 있거나 애매해서 NEW로 남겨 관리자가 확인
 * 키가 없거나 분류가 실패한 기사도 NEW로 남음 (예전처럼 사람이 확인)
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
    private readonly classifier: NewsClassifier,
    private readonly newsAdmin: NewsAdminService,
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
    if (this.running) {
      return { added: 0, skipped: 0, failedQueries: [] as string[], translated: 0, published: 0, dismissed: 0, held: 0, drafted: 0 };
    }
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
      const auto = await this.autoClassify();
      this.logger.log(
        `뉴스 수집: 새 기사 ${count}건 (검색 결과 ${found.length}건, 제목 번역 ${translated}건, ` +
          `자동 공개 ${auto.published}건 · 숨김 ${auto.dismissed}건 · 확인 필요 ${auto.held}건 · 사건 초안 ${auto.drafted}건)`,
      );
      return { added: count, skipped: found.length - count, failedQueries, translated, ...auto };
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

  /** 새 기사 제목을 Claude로 분류해 공개·숨김·확인 필요로 나눔 */
  async autoClassify() {
    const counts = { published: 0, dismissed: 0, held: 0, drafted: 0 };
    if (!this.config.get('NEWS_AUTO_PUBLISH', { infer: true }) || !this.classifier.isConfigured()) return counts;
    const rows = await this.repo.unclassifiedNew(CLASSIFY_LIMIT);
    // 사건방(초안 포함)에 이미 있는 사건과 겹치는지 보려고 한 번만 읽음. 이번에 만든 초안도 계속 추가함
    const known: CaseCandidate[] = rows.length ? await this.repo.caseCandidates() : [];
    for (let i = 0; i < rows.length; i += CLASSIFY_BATCH) {
      const batch = rows.slice(i, i + CLASSIFY_BATCH);
      const verdicts = await this.classifier.classify(batch);
      for (const [index, v] of verdicts) {
        const row = batch[index];
        const titleKo = row.titleKo ?? (row.lang !== 'ko' && v.titleKo.trim() ? v.titleKo.trim().slice(0, 300) : null);
        // 해외 기사인데 한국어 제목이 없으면 공개하지 않고 사람에게 넘김
        const verdict = v.verdict === 'PUBLISH' && row.lang !== 'ko' && !titleKo ? 'HOLD' : v.verdict;
        const status =
          verdict === 'PUBLISH' ? NewsStatus.PUBLISHED : verdict === 'DISMISS' ? NewsStatus.DISMISSED : NewsStatus.NEW;
        await this.repo.update(row.id, {
          status,
          titleKo,
          // 국기 표시는 수집 피드 나라가 아니라 사건이 일어난 나라로
          region: v.eventCountry,
          autoVerdict: NewsAutoVerdict[verdict],
          autoReason: v.reasonKo.slice(0, 300),
        });
        if (verdict === 'PUBLISH' && counts.drafted < DRAFT_LIMIT) {
          const created = await this.draftCase({ ...row, titleKo }, v, known);
          if (created) counts.drafted += 1;
        }
        if (verdict === 'PUBLISH') counts.published += 1;
        else if (verdict === 'DISMISS') counts.dismissed += 1;
        else counts.held += 1;
      }
    }
    return counts;
  }

  /**
   * 사실로 확인된 단계(실종·발견·기소·구형·선고 등)를 전하는 기사이고 사건방에 비슷한 사건이 없으면
   * '수사 중' 비공개 초안을 만듦. 의혹·주장·재호소·체포 직후 기사는 만들지 않음.
   * 출처가 기사 1곳뿐이라 검증 완료(출처 2곳)가 안 되므로 관리실에서 확인·출처 보강 후 공개함
   */
  private async draftCase(row: NewsRow, v: NewsVerdict, known: CaseCandidate[]) {
    if (v.caseEvent !== 'FACT' || row.caseId) return null;
    const title = v.draft.title.trim();
    const summary = v.draft.summary.trim();
    if (title.length < 2 || summary.length < 10) return null;
    const headline = row.titleKo ?? row.title;
    if (suggestCases(headline, known, 1).length > 0 || suggestCases(title, known, 1).length > 0) return null;
    try {
      const created = await this.newsAdmin.createDraftFromNews(
        row,
        {
          title: title.slice(0, 200),
          summary: summary.slice(0, 500),
          category: CaseCategory[v.draft.category],
          location: v.draft.location.trim().slice(0, 200) || undefined,
          timelineTitle: undefined,
        },
        `${AUTO_IMPORT_NOTE} (새 소식): 기사 1건으로 만든 초안입니다. 내용을 확인하고 출처를 하나 더 붙인 뒤 공개해 주세요. ${row.url}`,
      );
      known.push({ id: created.id, title: created.title, status: 'IN_PROGRESS', isPublished: false });
      return created;
    } catch (error) {
      this.logger.warn(`사건 초안 만들기 실패 (${row.url}): ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}
