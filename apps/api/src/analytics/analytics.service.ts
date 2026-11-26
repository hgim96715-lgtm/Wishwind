import { createHash, createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { processSalt } from '../admin/auth/admin-auth.js';
import type { Env } from '../config/env.js';
import type { PageViewInput } from './dto/analytics.dto.js';
import { caseSlugOf, fillDays, growthTips, kstDay, LOCAL_HOST, pathLabel, referrerHost, referrerLabel, appFromUserAgent, sourceOf, type TrafficSource } from './analytics.mapper.js';
import { AnalyticsRepository } from './analytics.repository.js';

const BOT = /bot|crawl|spider|slurp|headless|preview|lighthouse|monitor|curl|wget|python|axios|node-fetch/i;
/** 개발 중 내 컴퓨터(localhost)·사설망에서 본 것은 방문자 분석에 넣지 않음 */
const LOCAL_IP = /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::ffff:127\.)/;
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
    if ((siteHost && LOCAL_HOST.test(siteHost)) || LOCAL_IP.test(ip)) return { recorded: false };
    const referrer = referrerHost(input.referrer, siteHost);
    // localhost 페이지에서 눌러 들어온 것은 내가 개발 중에 확인한 것이므로 세지 않음
    if (referrer && LOCAL_HOST.test(referrer)) return { recorded: false };
    await this.repo.createPageView({
      path,
      visitorHash: this.visitorHash(ip, ua, kstDay()),
      // 링크에 출처 표시(utm_source)가 있으면 그것을 우선함. 앱 안 브라우저는 이전 사이트를 안 알려 주는 경우가 많음
      referrerHost: input.source ? `utm:${input.source.toLowerCase()}` : (referrer ?? appFromUserAgent(ua)),
    });
    return { recorded: true };
  }

  async stats(days: number) {
    const since = new Date(Date.now() - days * DAY_MS);
    const todayStart = new Date(`${kstDay()}T00:00:00+09:00`);
    const [daily, topPaths, topCases, referrers, rooms, today, participation, topAnsweredQuestions, firstVisits, singlePageVisitors, hourlyRows, bounceRows] = await Promise.all([
      this.repo.daily(since),
      this.repo.topPaths(since),
      this.repo.topCases(since),
      this.repo.referrers(since),
      this.repo.rooms(since),
      this.repo.since(todayStart),
      this.repo.participation(since),
      this.repo.topAnsweredQuestions(since),
      this.repo.firstVisits(since),
      this.repo.singlePageVisitors(since),
      this.repo.hourly(since),
      this.repo.sourceBounce(since),
    ]);
    // 들어온 곳(검색·SNS·직접·다른 사이트)과 처음 연 페이지
    const sources: Record<TrafficSource, number> = { search: 0, sns: 0, direct: 0, other: 0 };
    const landingCount = new Map<string, number>();
    for (const v of firstVisits) {
      sources[sourceOf(v.host)]++;
      landingCount.set(v.path, (landingCount.get(v.path) ?? 0) + 1);
    }
    const landing = await this.labelPaths(
      [...landingCount].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, visitors]) => ({ path, visitors })),
    );
    const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, views: hourlyRows.find((r) => r.hour === hour)?.views ?? 0 }));
    const peak = hourly.reduce((best, h) => (h.views > best.views ? h : best), hourly[0]);
    const labeledCases = await this.labelPaths(topCases);
    const visitorDays = daily.reduce((n, d) => n + d.visitors, 0);
    return {
      days,
      topPaths: await this.labelPaths(topPaths),
      topCases: labeledCases,
      sources,
      landing,
      hourly,
      singlePageVisitors,
      bounceBySource: bounceRows.map((r) => ({
        host: referrerLabel(r.host || null),
        visitors: r.visitors,
        single: r.single,
        homeOnly: r.homeOnly,
      })),
      tips: growthTips({
        days,
        visitorDays,
        sources,
        singlePageVisitors,
        topCase: labeledCases[0]?.label.replace(/^사건방 · /, ''),
        topLanding: landing[0]?.label,
        peakHour: peak.views > 0 ? peak.hour : undefined,
      }),
      today,
      totals: {
        views: daily.reduce((n, d) => n + d.views, 0),
        // 방문자 해시가 날마다 바뀌므로 기간 합계는 "일별 방문자의 합"임
        visitorDays,
      },
      daily: fillDays(daily, days),
      referrers: referrers.map((r) => ({ ...r, host: referrerLabel(r.host) })),
      rooms,
      participation,
      topAnsweredQuestions,
    };
  }

  private async labelPaths<T extends { path: string }>(rows: T[]) {
    const slugs = rows.flatMap((r) => caseSlugOf(r.path) ?? []);
    const titles = new Map((await this.repo.caseTitles(slugs)).map((c) => [c.slug, c.title]));
    return rows.map((r) => ({ ...r, label: pathLabel(r.path, titles) }));
  }
}
