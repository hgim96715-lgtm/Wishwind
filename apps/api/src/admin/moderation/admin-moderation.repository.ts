import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { UserContentStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ModerationListQuery } from './dto/admin-moderation.dto.js';

const TAKE = 150;

const latestModeration = {
  orderBy: { createdAt: 'desc' },
  take: 3,
  select: { stage: true, verdict: true, category: true, reason: true, createdAt: true },
} as const;

const reports = {
  orderBy: { createdAt: 'desc' },
  take: 5,
  select: { reason: true, createdAt: true },
} as const;

export const answerSelect = {
  id: true,
  body: true,
  status: true,
  voterId: true,
  reportCount: true,
  updatedAt: true,
  question: { select: { question: true, case: { select: { slug: true, title: true } } } },
  moderations: latestModeration,
  reports,
} as const satisfies Prisma.UserAnswerSelect;

export const questionSelect = {
  id: true,
  body: true,
  status: true,
  voterId: true,
  reportCount: true,
  updatedAt: true,
  case: { select: { slug: true, title: true } },
  moderations: latestModeration,
  reports,
} as const satisfies Prisma.UserQuestionSelect;

export const cloudSelect = {
  id: true,
  body: true,
  status: true,
  voterId: true,
  category: true,
  createdAt: true,
} as const satisfies Prisma.CloudMessageSelect;

export type AnswerRecord = Prisma.UserAnswerGetPayload<{ select: typeof answerSelect }>;
export type QuestionRecord = Prisma.UserQuestionGetPayload<{ select: typeof questionSelect }>;
export type CloudRecord = Prisma.CloudMessageGetPayload<{ select: typeof cloudSelect }>;

/** 상태 필터 → 세 테이블(답변·질문·구름)이 같이 쓰는 where */
function statusWhere(filter: ModerationListQuery['filter']) {
  switch (filter) {
    case 'held':
      return { status: UserContentStatus.HELD };
    case 'blocked':
      return { status: UserContentStatus.BLOCKED };
    case 'hidden':
      return { status: UserContentStatus.HIDDEN };
    case 'reported':
      return { reportCount: { gt: 0 } };
    case 'all':
      return {};
  }
}

/** 사용자 글(수사 노트 답변·질문, 실종자들의 정원 구름)과 참여 제한 목록 */
@Injectable()
export class AdminModerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  answers(filter: ModerationListQuery['filter']) {
    return this.prisma.userAnswer.findMany({
      where: statusWhere(filter) as Prisma.UserAnswerWhereInput,
      orderBy: { updatedAt: 'desc' },
      take: TAKE,
      select: answerSelect,
    });
  }

  questions(filter: ModerationListQuery['filter']) {
    return this.prisma.userQuestion.findMany({
      where: statusWhere(filter) as Prisma.UserQuestionWhereInput,
      orderBy: { updatedAt: 'desc' },
      take: TAKE,
      select: questionSelect,
    });
  }

  clouds(filter: ModerationListQuery['filter']) {
    return this.prisma.cloudMessage.findMany({
      where: statusWhere(filter) as Prisma.CloudMessageWhereInput,
      orderBy: { createdAt: 'desc' },
      take: TAKE,
      select: cloudSelect,
    });
  }

  async blockedAmong(voterIds: string[]) {
    if (voterIds.length === 0) return new Set<string>();
    const rows = await this.prisma.blockedVoter.findMany({
      where: { voterId: { in: [...new Set(voterIds)] } },
      select: { voterId: true },
    });
    return new Set(rows.map((r) => r.voterId));
  }

  updateAnswer(id: string, data: Prisma.UserAnswerUpdateInput) {
    return this.prisma.userAnswer.update({ where: { id }, data });
  }

  updateQuestion(id: string, data: Prisma.UserQuestionUpdateInput) {
    return this.prisma.userQuestion.update({ where: { id }, data });
  }

  updateCloud(id: string, data: Prisma.CloudMessageUpdateInput) {
    return this.prisma.cloudMessage.update({ where: { id }, data });
  }

  /** 신고 기각: 신고 기록을 지우고 신고 수를 0으로, 상태는 공개로 (검사 기록에 관리자 판단을 남김) */
  dismissReports(
    type: 'answer' | 'question',
    id: string,
    moderations: Prisma.UserAnswerUpdateInput['moderations'] & Prisma.UserQuestionUpdateInput['moderations'],
  ) {
    const data = { status: UserContentStatus.PUBLISHED, reportCount: 0, moderations };
    return this.prisma.$transaction([
      this.prisma.userContentReport.deleteMany({ where: type === 'answer' ? { answerId: id } : { questionId: id } }),
      type === 'answer'
        ? this.prisma.userAnswer.update({ where: { id }, data })
        : this.prisma.userQuestion.update({ where: { id }, data }),
    ]);
  }

  /** 한 사람(브라우저 익명 ID)이 남긴 모든 글 */
  voterActivity(voterId: string) {
    return Promise.all([
      this.prisma.userAnswer.findMany({
        where: { voterId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          body: true,
          status: true,
          reportCount: true,
          updatedAt: true,
          question: { select: { question: true, case: { select: { title: true, slug: true } } } },
        },
      }),
      this.prisma.userQuestion.findMany({
        where: { voterId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          body: true,
          status: true,
          reportCount: true,
          updatedAt: true,
          case: { select: { title: true, slug: true } },
        },
      }),
      this.prisma.cloudMessage.findMany({
        where: { voterId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, body: true, status: true, category: true, createdAt: true },
      }),
      this.prisma.blockedVoter.findUnique({ where: { voterId } }),
      this.prisma.inquiry.count({ where: { voterId } }),
    ]);
  }

  /** 참여 제한 + 이미 공개·보류된 글을 모두 숨김 (한 트랜잭션) */
  blockAndHide(voterId: string, reason: string | null) {
    const visible = { voterId, status: { in: [UserContentStatus.PUBLISHED, UserContentStatus.HELD] } };
    const hidden = { status: UserContentStatus.HIDDEN };
    return this.prisma.$transaction([
      this.prisma.blockedVoter.upsert({
        where: { voterId },
        create: { voterId, reason },
        update: { reason },
      }),
      this.prisma.userAnswer.updateMany({ where: visible, data: hidden }),
      this.prisma.userQuestion.updateMany({ where: visible, data: hidden }),
      this.prisma.cloudMessage.updateMany({ where: visible, data: hidden }),
    ]);
  }

  unblock(voterId: string) {
    return this.prisma.blockedVoter.deleteMany({ where: { voterId } });
  }

  listBlocked() {
    return this.prisma.blockedVoter.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  }
}
