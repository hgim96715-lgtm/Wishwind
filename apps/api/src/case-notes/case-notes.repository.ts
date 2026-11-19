import { Injectable } from '@nestjs/common';
import { UserContentStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ModerationResult } from './content-moderator.js';
import type { ReportTarget } from './dto/case-notes.dto.js';

const noteCaseSelect = {
  id: true,
  title: true,
  summary: true,
  status: true,
  country: true,
  unsolvedQuestions: { select: { id: true } },
  victims: { select: { name: true } },
  suspects: {
    select: {
      name: true,
      status: true,
      nameExceptionReason: true,
      sentences: { select: { isFinal: true, type: true } },
    },
  },
} as const;

/** 글 검사 결과를 저장할 모양 (본문·상태 + 검사 기록 1건) */
function moderatedData(result: ModerationResult) {
  return {
    body: result.body,
    status: result.status,
    moderations: { create: result.log },
  };
}

@Injectable()
export class CaseNotesRepository {
  constructor(readonly prisma: PrismaService) {}

  findPublishedCase(slug: string) {
    return this.prisma.case.findFirst({
      where: { slug, isPublished: true },
      select: noteCaseSelect,
    });
  }

  async countRecentWrites(voterId: string, since: Date) {
    const where = { voterId, updatedAt: { gte: since } };
    const [answers, questions] = await Promise.all([
      this.prisma.userAnswer.count({ where }),
      this.prisma.userQuestion.count({ where }),
    ]);
    return answers + questions;
  }

  // ── 조회 ─────────────────────────────

  findMyAnswers(voterId: string, questionIds: string[]) {
    return this.prisma.userAnswer.findMany({
      where: { voterId, questionId: { in: questionIds } },
      select: { id: true, questionId: true, body: true, status: true },
    });
  }

  countPublishedAnswers(questionIds: string[]) {
    return this.prisma.userAnswer.groupBy({
      by: ['questionId'],
      where: { questionId: { in: questionIds }, status: UserContentStatus.PUBLISHED },
      _count: { _all: true },
    });
  }

  findPublishedUserQuestions(caseId: string, take: number) {
    return this.prisma.userQuestion.findMany({
      where: { caseId, status: UserContentStatus.PUBLISHED },
      orderBy: [{ curiousCount: 'desc' }, { createdAt: 'desc' }],
      take,
      select: { id: true, body: true, curiousCount: true, voterId: true },
    });
  }

  findMyQuestion(caseId: string, voterId: string) {
    return this.prisma.userQuestion.findUnique({
      where: { caseId_voterId: { caseId, voterId } },
      select: { id: true, body: true, status: true },
    });
  }

  findPublishedAnswers(questionIds: string[], take: number) {
    return this.prisma.userAnswer.findMany({
      where: { questionId: { in: questionIds }, status: UserContentStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, questionId: true, body: true, createdAt: true, voterId: true },
    });
  }

  findMyCurious(voterId: string, userQuestionIds: string[]) {
    return this.prisma.userQuestionCurious.findMany({
      where: { voterId, userQuestionId: { in: userQuestionIds } },
      select: { userQuestionId: true },
    });
  }

  // ── 답변·질문 저장 ─────────────────────────────

  findAnswerStatus(questionId: string, voterId: string) {
    return this.prisma.userAnswer.findUnique({
      where: { questionId_voterId: { questionId, voterId } },
      select: { status: true },
    });
  }

  upsertAnswer(questionId: string, voterId: string, result: ModerationResult) {
    const data = moderatedData(result);
    return this.prisma.userAnswer.upsert({
      where: { questionId_voterId: { questionId, voterId } },
      create: { ...data, questionId, voterId },
      update: data,
    });
  }

  findQuestionStatus(caseId: string, voterId: string) {
    return this.prisma.userQuestion.findUnique({
      where: { caseId_voterId: { caseId, voterId } },
      select: { status: true },
    });
  }

  upsertQuestion(caseId: string, voterId: string, result: ModerationResult) {
    const data = moderatedData(result);
    return this.prisma.userQuestion.upsert({
      where: { caseId_voterId: { caseId, voterId } },
      create: { ...data, caseId, voterId },
      update: data,
    });
  }

  // ── 나도 궁금합니다 ─────────────────────────────

  findPublishedUserQuestion(id: string, caseId: string) {
    return this.prisma.userQuestion.findFirst({
      where: { id, caseId, status: UserContentStatus.PUBLISHED },
      select: { id: true },
    });
  }

  /** 같은 사람이 두 번 눌러도 1번만 셈 (createMany skipDuplicates → 새로 들어갔을 때만 +1) */
  addCurious(userQuestionId: string, voterId: string) {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.userQuestionCurious.createMany({
        data: [{ userQuestionId, voterId }],
        skipDuplicates: true,
      });
      if (count > 0) {
        await tx.userQuestion.update({
          where: { id: userQuestionId },
          data: { curiousCount: { increment: 1 } },
        });
      }
    });
  }

  // ── 신고 ─────────────────────────────

  findReportable(target: ReportTarget, id: string, caseId: string) {
    return target === 'answer'
      ? this.prisma.userAnswer.findFirst({
          where: { id, status: UserContentStatus.PUBLISHED, question: { caseId } },
          select: { id: true },
        })
      : this.prisma.userQuestion.findFirst({
          where: { id, status: UserContentStatus.PUBLISHED, caseId },
          select: { id: true },
        });
  }

  /** 신고 1건 저장 + 신고 수 증가 + 기준 이상이면 숨김. 같은 사람의 중복 신고는 세지 않음 */
  addReport(
    target: ReportTarget,
    id: string,
    voterId: string,
    reason: string | undefined,
    hideAfter: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.userContentReport.createMany({
        data: [
          {
            voterId,
            reason,
            answerId: target === 'answer' ? id : null,
            questionId: target === 'question' ? id : null,
          },
        ],
        skipDuplicates: true,
      });
      if (count === 0) return;
      const hide = {
        where: { id, reportCount: { gte: hideAfter } },
        data: { status: UserContentStatus.HIDDEN },
      };
      const bump = { where: { id }, data: { reportCount: { increment: 1 } } };
      if (target === 'answer') {
        await tx.userAnswer.update(bump);
        await tx.userAnswer.updateMany(hide);
      } else {
        await tx.userQuestion.update(bump);
        await tx.userQuestion.updateMany(hide);
      }
    });
  }
}

export type NoteCase = NonNullable<
  Awaited<ReturnType<CaseNotesRepository['findPublishedCase']>>
>;
