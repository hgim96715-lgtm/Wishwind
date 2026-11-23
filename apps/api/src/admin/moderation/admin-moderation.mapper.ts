import { UserContentStatus } from '../../generated/prisma/enums.js';
import type { AnswerRecord, CloudRecord, QuestionRecord } from './admin-moderation.repository.js';

const CLOUD_CONTEXT = '실종자들의 정원 응원 메시지';

/** 관리실 '부적절한 글' 목록의 한 줄. 세 종류의 글을 같은 모양으로 맞춤 */
export function answerItem(a: AnswerRecord, blocked: Set<string>) {
  return {
    type: 'answer' as const,
    id: a.id,
    body: a.body,
    status: a.status,
    voterId: a.voterId,
    voterBlocked: blocked.has(a.voterId),
    reportCount: a.reportCount,
    at: a.updatedAt,
    context: `${a.question.case.title} · ${a.question.question}`,
    caseSlug: a.question.case.slug,
    moderations: a.moderations,
    reports: a.reports,
  };
}

export function questionItem(q: QuestionRecord, blocked: Set<string>) {
  return {
    type: 'question' as const,
    id: q.id,
    body: q.body,
    status: q.status,
    voterId: q.voterId,
    voterBlocked: blocked.has(q.voterId),
    reportCount: q.reportCount,
    at: q.updatedAt,
    context: q.case.title,
    caseSlug: q.case.slug,
    moderations: q.moderations,
    reports: q.reports,
  };
}

export function cloudItem(c: CloudRecord, blocked: Set<string>) {
  return {
    type: 'cloud' as const,
    id: c.id,
    body: c.body,
    status: c.status,
    voterId: c.voterId,
    voterBlocked: blocked.has(c.voterId),
    reportCount: 0,
    at: c.createdAt,
    context: CLOUD_CONTEXT,
    caseSlug: null,
    moderations: c.category
      ? [{ stage: null, verdict: null, category: c.category, reason: null, createdAt: c.createdAt }]
      : [],
    reports: [],
  };
}

type VoterActivity = [
  { id: string; body: string; status: UserContentStatus; reportCount: number; updatedAt: Date; question: { question: string; case: { title: string } } }[],
  { id: string; body: string; status: UserContentStatus; reportCount: number; updatedAt: Date; case: { title: string } }[],
  { id: string; body: string; status: UserContentStatus; createdAt: Date }[],
  unknown,
  number,
];

/** 한 사람의 활동 요약 + 글 목록 */
export function toVoterDetail(voterId: string, [answers, questions, clouds, blocked, inquiries]: VoterActivity) {
  const all = [...answers, ...questions, ...clouds];
  const byStatus = Object.fromEntries(
    Object.values(UserContentStatus).map((s) => [s, all.filter((x) => x.status === s).length]),
  );
  return {
    voterId,
    blocked,
    inquiries,
    summary: {
      total: all.length,
      byStatus,
      reports: [...answers, ...questions].reduce((n, x) => n + x.reportCount, 0),
    },
    answers: answers.map((a) => ({
      id: a.id,
      body: a.body,
      status: a.status,
      reportCount: a.reportCount,
      at: a.updatedAt,
      context: `${a.question.case.title} · ${a.question.question}`,
    })),
    questions: questions.map((q) => ({
      id: q.id,
      body: q.body,
      status: q.status,
      reportCount: q.reportCount,
      at: q.updatedAt,
      context: q.case.title,
    })),
    clouds: clouds.map((c) => ({
      id: c.id,
      body: c.body,
      status: c.status,
      reportCount: 0,
      at: c.createdAt,
      context: CLOUD_CONTEXT,
    })),
  };
}
