import { API_URL, ApiUnavailableError } from "@/lib/cases/api";
import type { CaseCategory, CaseStatus, Country } from "@/lib/cases/types";

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
    region: "KR" | "US" | "GB" | "JP";
    publisher: string;
    publishedAt: string | null;
    case: { slug: string; title: string } | null;
  }[];
  recentCases: {
    slug: string;
    title: string;
    summary: string;
    status: CaseStatus;
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
    byStatus: { key: CaseStatus; count: number }[];
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

export async function getBriefing(): Promise<Briefing> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/briefing`, { cache: "no-store" });
  } catch (cause) {
    throw new ApiUnavailableError(`API 서버에 연결할 수 없습니다: ${API_URL}`, { cause });
  }
  if (!res.ok) throw new Error(`API 오류 ${res.status}: /briefing`);
  return (await res.json()) as Briefing;
}
