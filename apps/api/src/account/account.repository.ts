import { Injectable } from '@nestjs/common';
import type { AuthProvider } from '../generated/prisma/enums.js';
import type { Db } from '../common/prisma/db.js';
import { PrismaService } from '../prisma/prisma.service.js';

const RECENT = 20;

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

  /** 내 기록: 계정 익명 ID로 남긴 활동 */
  async activity(voterId: string) {
    const where = { voterId };
    const order = { createdAt: 'desc' } as const;
    const [answers, questions, votes, clouds, inquiries, counts] = await Promise.all([
      this.prisma.userAnswer.findMany({
        where,
        orderBy: order,
        take: RECENT,
        select: {
          id: true,
          body: true,
          status: true,
          createdAt: true,
          question: { select: { question: true, case: { select: { slug: true, title: true } } } },
        },
      }),
      this.prisma.userQuestion.findMany({
        where,
        orderBy: order,
        take: RECENT,
        select: {
          id: true,
          body: true,
          status: true,
          curiousCount: true,
          createdAt: true,
          case: { select: { slug: true, title: true } },
        },
      }),
      this.prisma.sentenceVote.findMany({
        where,
        orderBy: order,
        take: RECENT,
        select: {
          id: true,
          choice: true,
          direction: true,
          createdAt: true,
          sentence: { select: { penalty: true, suspect: { select: { case: { select: { slug: true, title: true } } } } } },
        },
      }),
      this.prisma.cloudMessage.findMany({
        where,
        orderBy: order,
        take: RECENT,
        select: { id: true, body: true, status: true, createdAt: true },
      }),
      this.prisma.inquiry.findMany({
        where,
        orderBy: order,
        take: 10,
        select: { id: true, kind: true, status: true, body: true, createdAt: true, reply: true, repliedAt: true },
      }),
      Promise.all([
        this.prisma.userAnswer.count({ where }),
        this.prisma.userQuestion.count({ where }),
        this.prisma.sentenceVote.count({ where }),
        this.prisma.cloudMessage.count({ where }),
        this.prisma.userQuestionCurious.count({ where }),
      ]),
    ]);
    return { answers, questions, votes, clouds, inquiries, counts };
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
