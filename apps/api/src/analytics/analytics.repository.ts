import { Injectable } from '@nestjs/common';
import { InquiryKind, UserContentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

type PathRow = { path: string; views: number; visitors: number };


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

  /** 방문자(하루 단위)마다 처음 연 페이지와 들어온 곳 */
  firstVisits(since: Date) {
    return this.prisma.$queryRaw<{ path: string; host: string | null }[]>`
      SELECT DISTINCT ON (visitor_hash) path, referrer_host AS host
      FROM page_views
      WHERE created_at >= ${since}
      ORDER BY visitor_hash, created_at`;
  }

  /** 한 페이지만 보고 나간 방문자 수 */
  async singlePageVisitors(since: Date) {
    const rows = await this.prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM (
        SELECT visitor_hash FROM page_views WHERE created_at >= ${since}
        GROUP BY visitor_hash HAVING count(*) = 1
      ) t`;
    return rows[0]?.n ?? 0;
  }

  /** 한국 시간 시각(0~23시)별 조회수 */
  hourly(since: Date) {
    return this.prisma.$queryRaw<{ hour: number; views: number }[]>`
      SELECT extract(hour FROM created_at AT TIME ZONE 'Asia/Seoul')::int AS hour, count(*)::int AS views
      FROM page_views
      WHERE created_at >= ${since}
      GROUP BY 1
      ORDER BY 1`;
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

  async topAnsweredQuestions(since: Date) {
    const grouped = await this.prisma.userAnswer.groupBy({
      by: ['questionId'],
      where: {
        createdAt: { gte: since },
        status: UserContentStatus.PUBLISHED,
        question: { case: { isPublished: true } },
      },
      _count: true,
      _sum: { empathyCount: true },
      orderBy: { _count: { questionId: 'desc' } },
      take: 20,
    });
    if (grouped.length === 0) return [];

    const questions = await this.prisma.unsolvedQuestion.findMany({
      where: { id: { in: grouped.map((row) => row.questionId) }, case: { isPublished: true } },
      select: { id: true, question: true, case: { select: { slug: true, title: true } } },
    });
    const byId = new Map(questions.map((question) => [question.id, question]));

    return grouped.flatMap((row) => {
      const question = byId.get(row.questionId);
      return question
        ? [{
            questionId: question.id,
            question: question.question,
            caseSlug: question.case.slug,
            caseTitle: question.case.title,
            answers: row._count,
            empathy: row._sum.empathyCount ?? 0,
          }]
        : [];
    });
  }
}
