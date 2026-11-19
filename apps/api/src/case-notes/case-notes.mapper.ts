import {
  CaseStatus,
  SentenceType,
  SuspectStatus,
  UserContentStatus,
} from '../generated/prisma/enums.js';
import type { CaseNotesRepository, NoteCase } from './case-notes.repository.js';

type Rows<K extends keyof CaseNotesRepository> =
  CaseNotesRepository[K] extends (...args: never[]) => infer R ? Awaited<R> : never;

/** 내 글이 이 상태면 다른 사람의 수사 노트를 볼 수 있음 */
export const UNLOCKING: UserContentStatus[] = [
  UserContentStatus.PUBLISHED,
  UserContentStatus.HELD,
];

/**
 * AI 글 검사에 넘길 "가려야 할 이름".
 * 무죄·혐의없음은 항상, 국내 사건은 유죄 확정 전 피의자와 피해자 이름까지.
 * 실명 예외(신상공개 등, nameExceptionReason)가 있으면 가리지 않음
 */
export function protectedNames(found: NoteCase) {
  const domestic = found.country === 'KR';
  const suspects = found.suspects.filter((s) => {
    if (s.nameExceptionReason) return false;
    const convicted =
      s.status === SuspectStatus.CONVICTED &&
      s.sentences.some((x) => x.isFinal && x.type !== SentenceType.ACQUITTAL);
    const cleared =
      s.status === SuspectStatus.ACQUITTED || s.status === SuspectStatus.CLEARED;
    return cleared || (domestic && !convicted);
  });
  const victims = domestic ? found.victims : [];
  return [...suspects, ...victims].flatMap((p) => (p.name ? [p.name] : []));
}

export function moderationContext(found: NoteCase) {
  return {
    title: found.title,
    summary: found.summary,
    protectedNames: protectedNames(found),
  };
}

export interface NotesRows {
  found: NoteCase;
  voterId: string | undefined;
  mine: Rows<'findMyAnswers'>;
  counts: Rows<'countPublishedAnswers'>;
  userQuestions: Rows<'findPublishedUserQuestions'>;
  myQuestion: Rows<'findMyQuestion'>;
  unlocked: string[];
  answers: Rows<'findPublishedAnswers'>;
  curiousIds: Set<string>;
}

/** 수사 노트 화면 응답. 다른 사람 글은 voterId 대신 isMine만 내보냄 */
export function toNotesView({
  found,
  voterId,
  mine,
  counts,
  userQuestions,
  myQuestion,
  unlocked,
  answers,
  curiousIds,
}: NotesRows) {
  return {
    canAsk: found.status === CaseStatus.UNSOLVED,
    questions: found.unsolvedQuestions.map(({ id: questionId }) => {
      const my = mine.find((a) => a.questionId === questionId);
      return {
        questionId,
        answerCount: counts.find((c) => c.questionId === questionId)?._count._all ?? 0,
        mine: my ? { body: my.body, status: my.status } : null,
        answers: unlocked.includes(questionId)
          ? answers
              .filter((a) => a.questionId === questionId)
              .map((a) => ({
                id: a.id,
                body: a.body,
                createdAt: a.createdAt,
                isMine: a.voterId === voterId,
              }))
          : null,
      };
    }),
    myQuestion,
    userQuestions: userQuestions.map((q) => ({
      id: q.id,
      body: q.body,
      curiousCount: q.curiousCount,
      curiousByMe: curiousIds.has(q.id),
      isMine: q.voterId === voterId,
    })),
  };
}
