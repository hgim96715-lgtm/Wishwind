import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import {
  BriefingKind,
  BriefingStatus,
  CaseStatus,
  MissingStatus,
  NewsStatus,
  UserContentStatus,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { closureSelect, hasFinalSentenceWhere } from '../cases/closure.js';
import type { PostListQuery } from './dto/briefing.dto.js';

const published = { status: BriefingStatus.PUBLISHED };
const publishedContent = { status: UserContentStatus.PUBLISHED };

const postSelect = {
  id: true,
  kind: true,
  title: true,
  body: true,
  isPinned: true,
  publishedAt: true,
  case: { select: { slug: true, title: true } },
} as const satisfies Prisma.BriefingPostSelect;

const withCase = { case: { select: { slug: true, title: true } } } as const;

/** 브리핑 글(관리자 작성)과 브리핑룸 집계에 쓰는 공개 데이터 */
@Injectable()
export class BriefingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- 브리핑 글 (관리실) ----

  listPosts(query: PostListQuery) {
    return this.prisma.briefingPost.findMany({
      where: { kind: query.kind, status: query.status },
      orderBy: [{ status: 'asc' }, { isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: withCase,
    });
  }

  findPost(id: string) {
    return this.prisma.briefingPost.findUnique({ where: { id }, include: withCase });
  }

  createPost(data: Prisma.BriefingPostUncheckedCreateInput) {
    return this.prisma.briefingPost.create({ data });
  }

  updatePost(id: string, data: Prisma.BriefingPostUncheckedUpdateInput) {
    return this.prisma.briefingPost.update({ where: { id }, data });
  }

  deletePost(id: string) {
    return this.prisma.briefingPost.delete({ where: { id } });
  }

  /** 의견 요약 재료: 공개된 사건의 질문별 답변, 사용자 질문, 확정 형량 */
  findOpinionSource(caseId: string) {
    return this.prisma.case.findFirst({
      where: { id: caseId, isPublished: true },
      select: {
        id: true,
        title: true,
        summary: true,
        unsolvedQuestions: {
          orderBy: { sortOrder: 'asc' },
          select: {
            question: true,
            userAnswers: {
              where: publishedContent,
              orderBy: { createdAt: 'desc' },
              take: 60,
              select: { body: true },
            },
          },
        },
        userQuestions: {
          where: publishedContent,
          orderBy: { curiousCount: 'desc' },
          take: 20,
          select: { body: true, curiousCount: true },
        },
        suspects: {
          select: {
            sentences: { where: { isFinal: true }, select: { id: true, penalty: true, type: true } },
          },
        },
      },
    });
  }

  /** 형량 투표를 (판결, 찬반, 방향)별로 셈. sentenceIds가 없으면 전체 */
  groupVotes(sentenceIds?: string[]) {
    return this.prisma.sentenceVote.groupBy({
      by: ['sentenceId', 'choice', 'direction'],
      ...(sentenceIds && { where: { sentenceId: { in: sentenceIds } } }),
      _count: true,
    });
  }

  // ---- 브리핑룸 (공개) ----

  notices() {
    return this.prisma.briefingPost.findMany({
      where: { ...published, kind: BriefingKind.NOTICE },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: 5,
      select: postSelect,
    });
  }

  /** 공지 외의 공개 글. 비공개 사건에 걸린 글은 빼서 사건 존재가 새지 않게 함 */
  posts(take: number) {
    return this.prisma.briefingPost.findMany({
      where: { ...published, kind: { not: BriefingKind.NOTICE }, OR: [{ caseId: null }, { case: { isPublished: true } }] },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take,
      select: postSelect,
    });
  }

  publishedNews(take: number) {
    return this.prisma.newsItem.findMany({
      where: { status: NewsStatus.PUBLISHED },
      orderBy: [{ publishedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take,
      select: {
        id: true,
        url: true,
        title: true,
        titleKo: true,
        region: true,
        publisher: true,
        publishedAt: true,
        case: { select: { slug: true, title: true, isPublished: true } },
      },
    });
  }

  recentCases(take: number) {
    return this.prisma.case.findMany({
      where: { isPublished: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      select: {
        slug: true,
        title: true,
        summary: true,
        status: true,
        category: true,
        country: true,
        occurredAt: true,
        createdAt: true,
        ...closureSelect,
      },
    });
  }

  recentMissing(take: number) {
    return this.prisma.missingPerson.findMany({
      where: { status: MissingStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        name: true,
        region: true,
        missingDate: true,
        ageAtMissing: true,
        thumbUrl: true,
        source: true,
        createdAt: true,
      },
    });
  }

  caseCounts() {
    const where = { isPublished: true };
    return Promise.all([
      this.prisma.case.count({ where }),
      this.prisma.case.groupBy({ by: ['category'], where, _count: true }),
      this.prisma.case.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.case.count({ where: { ...where, status: CaseStatus.SOLVED, ...hasFinalSentenceWhere } }),
      this.prisma.case.groupBy({ by: ['country'], where, _count: true }),
    ]);
  }

  /** 가해자 이름은 사건 파일의 실명 규칙을 따르므로 여기서는 가져오지 않음 */
  finalSentencesOfPublishedCases(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.sentence.findMany({
      where: { id: { in: ids }, isFinal: true, suspect: { case: { isPublished: true } } },
      select: {
        id: true,
        penalty: true,
        type: true,
        suspect: { select: { case: { select: { slug: true, title: true } } } },
      },
    });
  }

  mostCuriousQuestions(take: number) {
    return this.prisma.userQuestion.findMany({
      where: { ...publishedContent, curiousCount: { gt: 0 }, case: { isPublished: true } },
      orderBy: [{ curiousCount: 'desc' }, { createdAt: 'desc' }],
      take,
      select: { id: true, body: true, curiousCount: true, ...withCase },
    });
  }

  answerCountsByQuestion(take: number) {
    return this.prisma.userAnswer.groupBy({
      by: ['questionId'],
      where: publishedContent,
      _count: true,
      orderBy: { _count: { questionId: 'desc' } },
      take,
    });
  }

  questionsOfPublishedCases(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.unsolvedQuestion.findMany({
      where: { id: { in: ids }, case: { isPublished: true } },
      select: { id: true, question: true, ...withCase },
    });
  }

  /** 오늘의 질문: 공개 사건의 생각해볼 점 중 하나를 날짜(KST) 기준으로 하루씩 돌려 고름 */
  async questionOfDay(dayNumber: number) {
    const where = { isResolved: false, case: { isPublished: true } };
    const total = await this.prisma.unsolvedQuestion.count({ where });
    if (total === 0) return null;
    const [q] = await this.prisma.unsolvedQuestion.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: dayNumber % total,
      take: 1,
      select: { id: true, question: true, ...withCase },
    });
    return q ?? null;
  }

  recentAnswers(questionId: string | null, take: number) {
    return this.prisma.userAnswer.findMany({
      where: {
        ...publishedContent,
        question: { case: { isPublished: true } },
        ...(questionId ? { questionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        body: true,
        createdAt: true,
        question: { select: { question: true, case: { select: { slug: true, title: true } } } },
      },
    });
  }

  recentCheers(take: number) {
    return this.prisma.cloudMessage.findMany({
      where: publishedContent,
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, body: true, createdAt: true },
    });
  }

  participationCounts() {
    return Promise.all([
      this.prisma.userAnswer.count({ where: publishedContent }),
      this.prisma.userQuestion.count({ where: publishedContent }),
      this.prisma.sentenceVote.count(),
      this.prisma.cloudMessage.count({ where: publishedContent }),
    ]).then(([answers, questions, votes, clouds]) => ({ answers, questions, votes, clouds }));
  }
}
