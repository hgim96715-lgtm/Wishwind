import { createHash } from 'node:crypto';
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

/** 내 노트를 남기기 전에 질문마다 미리 보여 주는 다른 사람 노트 수. 남의 의견에 휩쓸리지 않게 0개 */
export const PREVIEW_COUNT = 0;

/**
 * 화면에 보이는 무작위 별명 ("바람 37"). 같은 사람은 사이트 어디서나 같은 별명.
 * voterId를 그대로 내보내지 않고 해시에서 숫자만 뽑음
 */
export function nickname(voterId: string) {
  const n = createHash('sha256').update(`wishwind:${voterId}`).digest().readUInt32BE(0);
  return `바람 ${(n % 999) + 1}`;
}

/**
 * 인기순으로만 쌓이면 한 가지 의견만 보이므로, 최근 글과 공감 받은 글을 번갈아 섞음
 */
export function mixNotes<T extends { id: string; createdAt: Date; empathyCount: number }>(rows: T[]) {
  const recent = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const liked = [...rows].sort(
    (a, b) => b.empathyCount - a.empathyCount || b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const out: T[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < rows.length; i++) {
    for (const list of [recent, liked]) {
      const row = list[i];
      if (row && !seen.has(row.id)) {
        seen.add(row.id);
        out.push(row);
      }
    }
  }
  return out;
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
  empathyIds: Set<string>;
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
  empathyIds,
}: NotesRows) {
  return {
    canAsk: found.status === CaseStatus.UNSOLVED,
    questions: found.unsolvedQuestions.map(({ id: questionId }) => {
      const my = mine.find((a) => a.questionId === questionId);
      const isUnlocked = unlocked.includes(questionId);
      const mixed = mixNotes(answers.filter((a) => a.questionId === questionId));
      // 잠긴 질문은 내 글을 뺀 다른 사람 노트 몇 개만 미리 보여 줌
      const visible = isUnlocked
        ? mixed
        : mixed.filter((a) => a.voterId !== voterId).slice(0, PREVIEW_COUNT);
      return {
        questionId,
        answerCount: counts.find((c) => c.questionId === questionId)?._count._all ?? 0,
        mine: my ? { body: my.body, status: my.status, empathyCount: my.empathyCount } : null,
        unlocked: isUnlocked,
        answers: visible.map((a) => ({
          id: a.id,
          body: a.body,
          createdAt: a.createdAt,
          nickname: nickname(a.voterId),
          empathyCount: a.empathyCount,
          empathizedByMe: empathyIds.has(a.id),
          isMine: a.voterId === voterId,
        })),
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
