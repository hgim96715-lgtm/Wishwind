import { cacheLife, cacheTag } from "next/cache";
import { API_URL, ApiUnavailableError } from "@/lib/cases/api";
import type { CaseCategory, CaseClosure, CaseStampKey, CaseStatus, Country } from "@/lib/cases/types";

export type BriefingKind = "NOTICE" | "NEWS" | "CASE_UPDATE" | "OPINION";

export interface BriefingPost {
  id: string;
  kind: BriefingKind;
  title: string;
  body: string;
  isPinned: boolean;
  publishedAt: string | null;
  case: { slug: string; title: string } | null;
}

export interface Briefing {
  notices: BriefingPost[];
  posts: BriefingPost[];
  news: {
    id: string;
    url: string;
    title: string;
    titleKo: string | null;
    region: "KR" | "US" | "GB" | "JP" | "CN" | "OTHER";
    publisher: string;
    publishedAt: string | null;
    case: { slug: string; title: string } | null;
  }[];
  /** 사람들의 생각 게시판 (공개 글만) */
  board: {
    question: { id: string; question: string; caseSlug: string; caseTitle: string } | null;
    notes: {
      id: string;
      body: string;
      createdAt: string;
      question: string;
      caseSlug: string;
      caseTitle: string;
      forToday: boolean;
    }[];
    cheers: { id: string; body: string; createdAt: string }[];
  };
  recentCases: {
    slug: string;
    title: string;
    summary: string;
    status: CaseStatus;
    closure: CaseClosure | null;
    category: CaseCategory;
    country: Country;
    occurredAt: string | null;
    createdAt: string;
  }[];
  missing: {
    id: string;
    name: string;
    region: string;
    missingDate: string | null;
    ageAtMissing: number | null;
    thumbUrl: string | null;
    source: "FBI" | "SAFE182";
    createdAt: string;
  }[];
  stats: {
    total: number;
    byCategory: { key: CaseCategory; count: number }[];
    byStatus: { key: CaseStampKey; count: number }[];
    byCountry: { key: Country; count: number }[];
  };
  opinions: {
    sentenceVotes: {
      sentenceId: string;
      penalty: string;
      caseSlug: string;
      caseTitle: string;
      agree: number;
      disagree: number;
      tooLenient: number;
      tooHarsh: number;
    }[];
    curious: { id: string; body: string; curiousCount: number; case: { slug: string; title: string } }[];
    mostAnswered: { id: string; question: string; answers: number; caseSlug: string; caseTitle: string }[];
  };
  participation: { answers: number; questions: number; votes: number; clouds: number };
}

/**
 * 브리핑은 모든 방문자에게 같은 내용 → 서버에서 1분 단위로 캐시해 함께 씀.
 * 방문자가 늘어도 API·DB 집계는 1분에 한 번 정도만 돌고, 페이지는 캐시된 결과로 바로 그려짐.
 * (오류는 캐시하지 않으므로 API가 잠깐 꺼져도 다음 요청에서 다시 시도함)
 */
export async function getBriefing(): Promise<Briefing> {
  "use cache";
  cacheLife("minutes");
  cacheTag("briefing");
  let res: Response;
  try {
    res = await fetch(`${API_URL}/briefing`);
  } catch (cause) {
    throw new ApiUnavailableError(`API 서버에 연결할 수 없습니다: ${API_URL}`, { cause });
  }
  if (!res.ok) throw new Error(`API 오류 ${res.status}: /briefing`);
  return (await res.json()) as Briefing;
}
