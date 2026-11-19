import { Injectable } from '@nestjs/common';
import { InquiryKind, UserContentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

type PathRow = { path: string; views: number; visitors: number };

/** page_views 집계는 날짜 변환·DISTINCT가 필요해 SQL로 씀 (모두 바인딩 파라미터) */
@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createPageView(data: { path: string; visitorHash: string; referrerHost: string | null }) {
    return this.prisma.pageView.create({ data });
  }

  daily(since: Date) {
    return this.prisma.$queryRaw<{ day: string; views: number; visitors: number }[]>`
      SELECT to_char((created_at AT TIME ZONE 'Asia/Seoul')::date, 'YYYY-MM-DD') AS day,
             count(*)::int AS views,
             count(DISTINCT visitor_hash)::int AS visitors
      FROM page_views
      WHERE created_at >= ${since}
      GROUP BY 1
      ORDER BY 1`;
  }

  /** 사건 상세는 "많이 본 페이지"를 다 차지하므로 topCases로 따로 모음 */
  topPaths(since: Date) {
    return this.prisma.$queryRaw<PathRow[]>`
      SELECT path, count(*)::int AS views, count(DISTINCT visitor_hash)::int AS visitors
      FROM page_views
      WHERE created_at >= ${since} AND path NOT LIKE '/cases/%'
      GROUP BY path
      ORDER BY views DESC
      LIMIT 15`;
  }

  topCases(since: Date) {
    return this.prisma.$queryRaw<PathRow[]>`
      SELECT path, count(*)::int AS views, count(DISTINCT visitor_hash)::int AS visitors
      FROM page_views
      WHERE created_at >= ${since} AND path LIKE '/cases/%'
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10`;
  }

  referrers(since: Date) {
    return this.prisma.$queryRaw<{ host: string; views: number }[]>`
      SELECT referrer_host AS host, count(*)::int AS views
      FROM page_views
      WHERE created_at >= ${since} AND referrer_host IS NOT NULL
      GROUP BY referrer_host
      ORDER BY views DESC
      LIMIT 10`;
  }

  rooms(since: Date) {
    return this.prisma.$queryRaw<{ room: string; views: number }[]>`
      SELECT coalesce(nullif(split_part(path, '/', 2), ''), 'home') AS room, count(*)::int AS views
      FROM page_views
      WHERE created_at >= ${since}
      GROUP BY 1
      ORDER BY views DESC`;
  }

  async since(start: Date) {
    const rows = await this.prisma.$queryRaw<{ views: number; visitors: number }[]>`
      SELECT count(*)::int AS views, count(DISTINCT visitor_hash)::int AS visitors
      FROM page_views
      WHERE created_at >= ${start}`;
    return rows[0] ?? { views: 0, visitors: 0 };
  }

  caseTitles(slugs: string[]) {
    if (slugs.length === 0) return Promise.resolve([]);
    return this.prisma.case.findMany({ where: { slug: { in: slugs } }, select: { slug: true, title: true } });
  }

  participation(since: Date) {
    const created = { createdAt: { gte: since } };
    return Promise.all([
      this.prisma.userAnswer.count({ where: created }),
      this.prisma.userQuestion.count({ where: created }),
      this.prisma.sentenceVote.count({ where: created }),
      this.prisma.cloudMessage.count({ where: created }),
      this.prisma.inquiry.count({ where: { ...created, kind: { not: InquiryKind.FEEDBACK } } }),
      this.prisma.inquiry.count({ where: { ...created, kind: InquiryKind.FEEDBACK } }),
      this.prisma.userAnswer.count({
        where: { ...created, status: { in: [UserContentStatus.BLOCKED, UserContentStatus.HIDDEN] } },
      }),
    ]).then(([answers, questions, votes, clouds, inquiries, feedback, blockedAnswers]) => ({
      answers,
      questions,
      votes,
      clouds,
      inquiries,
      feedback,
      blockedAnswers,
    }));
  }
}
