import type { CaseCategory, CaseStatus, Country, RelatedContent } from "@/lib/cases/types";

export type ReviewStatus = "DRAFT" | "NEEDS_REVIEW" | "VERIFIED" | "REJECTED";
export type ContentStatus = "PUBLISHED" | "HELD" | "BLOCKED" | "HIDDEN";
export type BriefingKind = "NOTICE" | "NEWS" | "CASE_UPDATE" | "OPINION";
export type BriefingStatus = "DRAFT" | "PUBLISHED";
export type InquiryKind = "QUESTION" | "CORRECTION" | "FEEDBACK";
export type InquiryStatus = "OPEN" | "ANSWERED" | "CLOSED";
export type DatePrecision = "DAY" | "MONTH" | "YEAR" | "UNKNOWN";

export interface ActionState {
  ok?: string;
  error?: string;
}

export interface Overview {
  cases: { needsReview: number; drafts: number; unpublishedVerified: number; published: number; autoImported: number };
  moderation: { held: number; reported: number; blockedVoters: number };
  inquiries: { open: number; newFeedback: number };
  briefing: { drafts: number; newNews: number };
}

export interface AdminCaseRow {
  id: string;
  slug: string;
  title: string;
  country: Country;
  category: CaseCategory;
  status: CaseStatus;
  reviewStatus: ReviewStatus;
  isPublished: boolean;
  lastVerifiedAt: string | null;
  updatedAt: string;
  sourceCount: number;
}

export interface AdminCaseList {
  items: AdminCaseRow[];
  counts: { reviewStatus: ReviewStatus; isPublished: boolean; count: number }[];
}

export interface AdminCaseDetail {
  id: string;
  slug: string;
  title: string;
  summary: string;
  overview: string | null;
  victimCountNote: string | null;
  country: Country;
  category: CaseCategory;
  status: CaseStatus;
  location: string | null;
  occurredAt: string | null;
  occurredAtPrecision: DatePrecision;
  solvedAt: string | null;
  isPublished: boolean;
  reviewStatus: ReviewStatus;
  reviewNote: string | null;
  lastVerifiedAt: string | null;
  updatedAt: string;
  sources: {
    id: string;
    title: string;
    publisher: string;
    url: string;
    type: string;
    publishedAt: string | null;
    _count: { claims: number };
  }[];
  /** 관련 콘텐츠(다큐·방송·유튜브 등). 사실의 출처가 아니라 '더 보기' 링크 */
  relatedContents: RelatedContent[];
  briefingPosts: { id: string; kind: BriefingKind; status: BriefingStatus; title: string; createdAt: string }[];
  _count: Record<
    "timeline" | "suspects" | "victims" | "unsolvedQuestions" | "suspiciousCircumstances" | "userQuestions",
    number
  >;
}

export interface ModerationLog {
  stage: string | null;
  verdict: string | null;
  category: string;
  reason: string | null;
  createdAt: string;
}

export interface ModerationItem {
  type: "answer" | "question" | "cloud";
  id: string;
  body: string;
  status: ContentStatus;
  voterId: string;
  voterBlocked: boolean;
  reportCount: number;
  at: string;
  context: string;
  caseSlug: string | null;
  moderations: ModerationLog[];
  reports: { reason: string | null; createdAt: string }[];
}

export interface VoterPost {
  id: string;
  body: string;
  status: ContentStatus;
  reportCount: number;
  at: string;
  context: string;
}

export interface VoterDetail {
  voterId: string;
  blocked: { reason: string | null; createdAt: string } | null;
  inquiries: number;
  summary: { total: number; byStatus: Record<ContentStatus, number>; reports: number };
  answers: VoterPost[];
  questions: VoterPost[];
  clouds: VoterPost[];
}

export interface BriefingPost {
  id: string;
  kind: BriefingKind;
  status: BriefingStatus;
  title: string;
  body: string;
  isPinned: boolean;
  caseId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  case: { slug: string; title: string } | null;
}

export interface Inquiry {
  id: string;
  kind: InquiryKind;
  status: InquiryStatus;
  voterId: string;
  caseSlug: string | null;
  body: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface Analytics {
  days: number;
  today: { views: number; visitors: number };
  totals: { views: number; visitorDays: number };
  daily: { day: string; views: number; visitors: number }[];
  topPaths: { path: string; label: string; views: number; visitors: number }[];
  topCases: { path: string; label: string; views: number; visitors: number }[];
  referrers: { host: string; views: number }[];
  rooms: { room: string; views: number }[];
  participation: {
    answers: number;
    questions: number;
    votes: number;
    clouds: number;
    inquiries: number;
    feedback: number;
    blockedAnswers: number;
  };
}

export type NewsStatus = "NEW" | "PUBLISHED" | "DISMISSED";

export interface NewsItem {
  id: string;
  url: string;
  title: string;
  publisher: string;
  query: string;
  status: NewsStatus;
  region: "KR" | "US" | "GB" | "JP" | "CN" | "OTHER";
  lang: string;
  titleKo: string | null;
  /** Claude 자동 분류 결과 (분류 전이거나 키가 없으면 null) */
  autoVerdict: "PUBLISH" | "HOLD" | "DISMISS" | null;
  autoReason: string | null;
  publishedAt: string | null;
  reviewedAt: string | null;
  caseId: string | null;
  case: { slug: string; title: string } | null;
  /** 제목 낱말이 겹치는 사건 후보 (연결 안 된 기사만) */
  suggestions: { id: string; title: string; isPublished: boolean }[];
  createdAt: string;
}
