import { createHash, createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { processSalt } from '../admin/auth/admin-auth.js';
import type { Env } from '../config/env.js';
import type { PageViewInput } from './dto/analytics.dto.js';
import { caseSlugOf, fillDays, kstDay, pathLabel, referrerHost } from './analytics.mapper.js';
import { AnalyticsRepository } from './analytics.repository.js';

const BOT = /bot|crawl|spider|slurp|headless|preview|lighthouse|monitor|curl|wget|python|axios|node-fetch/i;
const SKIP = /^\/(admin|api|_next)(\/|$)/;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 쿠키 없는 방문자 집계. IP·브라우저 정보를 그대로 저장하지 않고,
 * "날마다 바뀌는 비밀값 + IP + 브라우저"의 해시만 저장함 → 같은 날 안에서만 같은 사람으로 셈, 날이 바뀌면 추적 불가
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly repo: AnalyticsRepository,
    private readonly config: ConfigService<Env, true>,
  ) {}

  visitorHash(ip: string, ua: string, day: string) {
    const secret = this.config.get('ADMIN_SESSION_SECRET', { infer: true }) ?? processSalt;
    const daily = createHmac('sha256', secret).update(`visitor:${day}`).digest('hex');
    return createHash('sha256').update(`${daily}|${ip}|${ua}`).digest('hex');
  }

  async record(input: PageViewInput, ip: string, ua: string, siteHost?: string) {
    const path = input.path.split(/[?#]/)[0] || '/';
    if (!ua || BOT.test(ua) || SKIP.test(path)) return { recorded: false };
    await this.repo.createPageView({
      path,
      visitorHash: this.visitorHash(ip, ua, kstDay()),
      referrerHost: referrerHost(input.referrer, siteHost),
    });
    return { recorded: true };
  }

  async stats(days: number) {
    const since = new Date(Date.now() - days * DAY_MS);
    const todayStart = new Date(`${kstDay()}T00:00:00+09:00`);
    const [daily, topPaths, topCases, referrers, rooms, today, participation] = await Promise.all([
      this.repo.daily(since),
      this.repo.topPaths(since),
      this.repo.topCases(since),
      this.repo.referrers(since),
      this.repo.rooms(since),
      this.repo.since(todayStart),
      this.repo.participation(since),
    ]);
    return {
      days,
      topPaths: await this.labelPaths(topPaths),
      topCases: await this.labelPaths(topCases),
      today,
      totals: {
        views: daily.reduce((n, d) => n + d.views, 0),
        // 방문자 해시가 날마다 바뀌므로 기간 합계는 "일별 방문자의 합"임
        visitorDays: daily.reduce((n, d) => n + d.visitors, 0),
      },
      daily: fillDays(daily, days),
      referrers,
      rooms,
      participation,
    };
  }

  private async labelPaths<T extends { path: string }>(rows: T[]) {
    const slugs = rows.flatMap((r) => caseSlugOf(r.path) ?? []);
    const titles = new Map((await this.repo.caseTitles(slugs)).map((c) => [c.slug, c.title]));
    return rows.map((r) => ({ ...r, label: pathLabel(r.path, titles) }));
  }
}
