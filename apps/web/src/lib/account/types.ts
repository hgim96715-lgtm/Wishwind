export interface Providers {
  naver: boolean;
  google: boolean;
}

type ContentStatus = "PUBLISHED" | "HELD" | "BLOCKED" | "HIDDEN";
interface CaseRef {
  slug: string;
  title: string;
}

export interface Me {
  /** 사이트 닉네임 (정하지 않았으면 "바람 N") */
  nickname: string;
  providers: ("NAVER" | "GOOGLE")[];
  joinedAt: string;
  counts: { answers: number; questions: number; votes: number; clouds: number; curious: number };
  answers: { id: string; body: string; status: ContentStatus; createdAt: string; question: string; case: CaseRef }[];
  questions: { id: string; body: string; status: ContentStatus; curiousCount: number; createdAt: string; case: CaseRef }[];
  votes: {
    id: string;
    choice: "AGREE" | "DISAGREE";
    direction: "TOO_LENIENT" | "TOO_HARSH" | null;
    createdAt: string;
    penalty: string | null;
    case: CaseRef;
  }[];
  clouds: { id: string; body: string; status: ContentStatus; createdAt: string }[];
  inquiries: {
    id: string;
    kind: "QUESTION" | "CORRECTION" | "FEEDBACK";
    status: "OPEN" | "ANSWERED" | "CLOSED";
    body: string;
    createdAt: string;
    /** 운영자 답변 (없으면 null) */
    reply: string | null;
    repliedAt: string | null;
  }[];
}
