import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuthProvider } from '../generated/prisma/enums.js';
import type { Db } from '../common/prisma/db.js';
import { PrismaService } from '../prisma/prisma.service.js';

const RECENT = 20;

const caseSelect = { select: { slug: true, title: true } } as const;
/** 나의 기록 칸별로 내보내는 필드 */
const SELECTS = {
  answers: {
    id: true,
    body: true,
    status: true,
    createdAt: true,
    question: { select: { question: true, case: caseSelect } },
  },
  questions: { id: true, body: true, status: true, curiousCount: true, createdAt: true, case: caseSelect },
  votes: {
    id: true,
    choice: true,
    direction: true,
    createdAt: true,
    sentence: { select: { penalty: true, suspect: { select: { case: caseSelect } } } },
  },
  clouds: { id: true, body: true, status: true, createdAt: true },
  inquiries: { id: true, kind: true, status: true, body: true, createdAt: true, reply: true, repliedAt: true },
} as const;

export type ActivityKind = keyof typeof SELECTS;
export const ACTIVITY_KINDS = Object.keys(SELECTS) as ActivityKind[];
type ActivityRows = {
  answers: Prisma.UserAnswerGetPayload<{ select: typeof SELECTS.answers }>[];
  questions: Prisma.UserQuestionGetPayload<{ select: typeof SELECTS.questions }>[];
  votes: Prisma.SentenceVoteGetPayload<{ select: typeof SELECTS.votes }>[];
  clouds: Prisma.CloudMessageGetPayload<{ select: typeof SELECTS.clouds }>[];
  inquiries: Prisma.InquiryGetPayload<{ select: typeof SELECTS.inquiries }>[];
};

@Injectable()
export class AccountRepository {
  constructor(readonly prisma: PrismaService) {}

  findAccount(provider: AuthProvider, providerUserId: string, db: Db = this.prisma) {
    return db.userAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      select: { user: { select: { id: true, voterId: true } } },
    });
  }

  findUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, voterId: true, nickname: true, createdAt: true, accounts: { select: { provider: true } } },
    });
  }

  /** 이 익명 ID가 이미 어떤 계정의 ID인지 */
  async voterOwned(voterId: string, db: Db = this.prisma) {
    return !!(await db.user.findUnique({ where: { voterId }, select: { id: true } }));
  }

  createUser(db: Db, voterId: string, provider: AuthProvider, providerUserId: string) {
    return db.user.create({
      data: { voterId, accounts: { create: { provider, providerUserId } } },
      select: { id: true, voterId: true },
    });
  }

  touchLogin(id: string) {
    return this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() }, select: { id: true } });
  }

  deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id }, select: { id: true } });
  }

  /**
   * 익명 ID(from)로 남긴 활동을 계정 ID(to)로 옮김.
   * 1인 1표·1글 규칙(unique)과 부딪히는 행은 옮기지 않고 그대로 둠 → 지우는 데이터 없음.
   * from이 참여 제한 상태였다면 계정 ID도 제한함 (로그인으로 제한을 풀 수 없게)
   */
  async mergeVoter(db: Db, from: string, to: string) {
    await db.$executeRaw`
      UPDATE sentence_votes t SET voter_id = ${to}::uuid
      WHERE t.voter_id = ${from}::uuid
        AND NOT EXISTS (SELECT 1 FROM sentence_votes o WHERE o.voter_id = ${to}::uuid AND o.sentence_id = t.sentence_id)`;
    await db.$executeRaw`
      UPDATE user_answers t SET voter_id = ${to}::uuid
      WHERE t.voter_id = ${from}::uuid
        AND NOT EXISTS (SELECT 1 FROM user_answers o WHERE o.voter_id = ${to}::uuid AND o.question_id = t.question_id)`;
    await db.$executeRaw`
      UPDATE user_questions t SET voter_id = ${to}::uuid
      WHERE t.voter_id = ${from}::uuid
        AND NOT EXISTS (SELECT 1 FROM user_questions o WHERE o.voter_id = ${to}::uuid AND o.case_id = t.case_id)`;
    await db.$executeRaw`
      UPDATE user_question_curious t SET voter_id = ${to}::uuid
      WHERE t.voter_id = ${from}::uuid
        AND NOT EXISTS (SELECT 1 FROM user_question_curious o WHERE o.voter_id = ${to}::uuid AND o.user_question_id = t.user_question_id)`;
    await db.$executeRaw`
      UPDATE user_content_reports t SET voter_id = ${to}::uuid
      WHERE t.voter_id = ${from}::uuid
        AND NOT EXISTS (
          SELECT 1 FROM user_content_reports o
          WHERE o.voter_id = ${to}::uuid
            AND (o.answer_id = t.answer_id OR o.question_id = t.question_id))`;
    await db.cloudMessage.updateMany({ where: { voterId: from }, data: { voterId: to } });
    await db.inquiry.updateMany({ where: { voterId: from }, data: { voterId: to } });
    await db.$executeRaw`
      INSERT INTO blocked_voters (voter_id, reason, created_at)
      SELECT ${to}::uuid, b.reason, now() FROM blocked_voters b WHERE b.voter_id = ${from}::uuid
      ON CONFLICT (voter_id) DO NOTHING`;
  }

  /** 내 기록: 계정 익명 ID로 남긴 활동 (칸마다 최근 RECENT개 + 전체 개수) */
  async activity(voterId: string) {
    const where = { voterId };
    const [answers, questions, votes, clouds, inquiries, counts] = await Promise.all([
      this.activityPage(voterId, 'answers'),
      this.activityPage(voterId, 'questions'),
      this.activityPage(voterId, 'votes'),
      this.activityPage(voterId, 'clouds'),
      this.activityPage(voterId, 'inquiries'),
      Promise.all([
        this.prisma.userAnswer.count({ where }),
        this.prisma.userQuestion.count({ where }),
        this.prisma.sentenceVote.count({ where }),
        this.prisma.cloudMessage.count({ where }),
        this.prisma.userQuestionCurious.count({ where }),
        this.prisma.inquiry.count({ where }),
      ]),
    ]);
    return { answers, questions, votes, clouds, inquiries, counts };
  }

  /** 한 칸의 기록을 최신순으로 take개. before가 있으면 그 시각보다 앞선 것만 ('더 불러오기') */
  activityPage<K extends ActivityKind>(voterId: string, kind: K, before?: Date, take = RECENT) {
    const args = {
      where: { voterId, ...(before && { createdAt: { lt: before } }) },
      orderBy: { createdAt: 'desc' as const },
      take,
    };
    const run = {
      answers: () => this.prisma.userAnswer.findMany({ ...args, select: SELECTS.answers }),
      questions: () => this.prisma.userQuestion.findMany({ ...args, select: SELECTS.questions }),
      votes: () => this.prisma.sentenceVote.findMany({ ...args, select: SELECTS.votes }),
      clouds: () => this.prisma.cloudMessage.findMany({ ...args, select: SELECTS.clouds }),
      inquiries: () => this.prisma.inquiry.findMany({ ...args, select: SELECTS.inquiries }),
    };
    return run[kind]() as Promise<ActivityRows[K]>;
  }

  /** 다른 사람이 이미 쓰는 닉네임인지 (대소문자 무시) */
  nicknameTaken(nickname: string, exceptUserId: string) {
    return this.prisma.user.findFirst({
      where: { nickname: { equals: nickname, mode: 'insensitive' }, id: { not: exceptUserId } },
      select: { id: true },
    });
  }

  updateNickname(id: string, nickname: string) {
    return this.prisma.user.update({ where: { id }, data: { nickname } });
  }
}
