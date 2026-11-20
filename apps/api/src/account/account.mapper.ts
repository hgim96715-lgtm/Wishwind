import { nickname as windName } from '../case-notes/case-notes.mapper.js';
import type { AccountRepository } from './account.repository.js';

type Activity = Awaited<ReturnType<AccountRepository['activity']>>;
type UserRow = NonNullable<Awaited<ReturnType<AccountRepository['findUser']>>>;

const caseRef = (c: { slug: string; title: string }) => ({ slug: c.slug, title: c.title });

/** 계정 닉네임. 아직 정하지 않았으면 수사 노트에 보이는 "바람 N"을 그대로 씀 */
export function accountNickname(user: { nickname: string | null; voterId: string }) {
  return user.nickname ?? windName(user.voterId);
}

type Rows = Activity;

/** 칸별로 화면에 내보낼 모양 (익명 ID는 내보내지 않음) */
export const mapActivity = {
  answers: (rows: Rows['answers']) =>
    rows.map((x) => ({
      id: x.id,
      body: x.body,
      status: x.status,
      createdAt: x.createdAt,
      question: x.question.question,
      case: caseRef(x.question.case),
    })),
  questions: (rows: Rows['questions']) =>
    rows.map((x) => ({
      id: x.id,
      body: x.body,
      status: x.status,
      curiousCount: x.curiousCount,
      createdAt: x.createdAt,
      case: caseRef(x.case),
    })),
  votes: (rows: Rows['votes']) =>
    rows.map((x) => ({
      id: x.id,
      choice: x.choice,
      direction: x.direction,
      createdAt: x.createdAt,
      penalty: x.sentence.penalty,
      case: caseRef(x.sentence.suspect.case),
    })),
  clouds: (rows: Rows['clouds']) => rows,
  inquiries: (rows: Rows['inquiries']) =>
    rows.map((x) => ({ ...x, body: x.body.length > 120 ? `${x.body.slice(0, 120)}…` : x.body })),
};

/** 내 기록 응답. 익명 ID(voterId)는 내보내지 않음 */
export function toMe(user: UserRow, a: Activity) {
  const [answers, questions, votes, clouds, curious, inquiries] = a.counts;
  return {
    nickname: accountNickname(user),
    providers: user.accounts.map((x) => x.provider),
    joinedAt: user.createdAt,
    counts: { answers, questions, votes, clouds, curious, inquiries },
    answers: mapActivity.answers(a.answers),
    questions: mapActivity.questions(a.questions),
    votes: mapActivity.votes(a.votes),
    clouds: mapActivity.clouds(a.clouds),
    inquiries: mapActivity.inquiries(a.inquiries),
  };
}
