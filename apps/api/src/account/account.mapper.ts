import { nickname as windName } from '../case-notes/case-notes.mapper.js';
import type { AccountRepository } from './account.repository.js';

type Activity = Awaited<ReturnType<AccountRepository['activity']>>;
type UserRow = NonNullable<Awaited<ReturnType<AccountRepository['findUser']>>>;

const caseRef = (c: { slug: string; title: string }) => ({ slug: c.slug, title: c.title });

/** 계정 닉네임. 아직 정하지 않았으면 수사 노트에 보이는 "바람 N"을 그대로 씀 */
export function accountNickname(user: { nickname: string | null; voterId: string }) {
  return user.nickname ?? windName(user.voterId);
}

/** 내 기록 응답. 익명 ID(voterId)는 내보내지 않음 */
export function toMe(user: UserRow, a: Activity) {
  const [answers, questions, votes, clouds, curious] = a.counts;
  return {
    nickname: accountNickname(user),
    providers: user.accounts.map((x) => x.provider),
    joinedAt: user.createdAt,
    counts: { answers, questions, votes, clouds, curious },
    answers: a.answers.map((x) => ({
      id: x.id,
      body: x.body,
      status: x.status,
      createdAt: x.createdAt,
      question: x.question.question,
      case: caseRef(x.question.case),
    })),
    questions: a.questions.map((x) => ({
      id: x.id,
      body: x.body,
      status: x.status,
      curiousCount: x.curiousCount,
      createdAt: x.createdAt,
      case: caseRef(x.case),
    })),
    votes: a.votes.map((x) => ({
      id: x.id,
      choice: x.choice,
      direction: x.direction,
      createdAt: x.createdAt,
      penalty: x.sentence.penalty,
      case: caseRef(x.sentence.suspect.case),
    })),
    clouds: a.clouds,
    inquiries: a.inquiries.map((x) => ({ ...x, body: x.body.length > 120 ? `${x.body.slice(0, 120)}…` : x.body })),
  };
}
