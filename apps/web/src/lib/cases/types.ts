/**
 * NestJS API(/api/cases) 응답 타입.
 * 원본은 apps/api/prisma/schema.prisma. 공유 패키지가 생기면 그쪽으로 옮길 것.
 * Date 컬럼은 JSON으로 오면서 ISO 문자열이 됨.
 */
export type Country = "KR" | "US" | "JP" | "CN" | "GB" | "OTHER";
export type CaseCategory =
  | "MURDER"
  | "MISSING"
  | "KIDNAPPING"
  | "SEXUAL_CRIME"
  | "ROBBERY"
  | "ARSON"
  | "TERROR"
  | "FRAUD"
  | "OTHER";
export type CaseStatus = "UNSOLVED" | "IN_PROGRESS" | "SOLVED";
export type DatePrecision = "DAY" | "MONTH" | "YEAR" | "UNKNOWN";
export type SuspectStatus =
  | "SUSPECTED"
  | "ARRESTED"
  | "INDICTED"
  | "CONVICTED"
  | "ACQUITTED"
  | "CLEARED"
  | "DECEASED"
  | "AT_LARGE";
export type VictimStatus =
  | "DECEASED"
  | "INJURED"
  | "MISSING"
  | "FOUND_ALIVE"
  | "UNKNOWN";
export type Gender = "MALE" | "FEMALE" | "UNKNOWN";
export type CourtLevel = "FIRST" | "APPEAL" | "SUPREME" | "OTHER";
export type SentenceType =
  | "DEATH"
  | "LIFE"
  | "IMPRISONMENT"
  | "PROBATION"
  | "FINE"
  | "ACQUITTAL"
  | "OTHER";

export interface CaseListItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  country: Country;
  category: CaseCategory;
  status: CaseStatus;
  location: string | null;
  occurredAt: string | null;
  occurredAtPrecision: DatePrecision;
  /** 개발 환경 미리보기에서만 true가 될 수 있음 */
  reviewPending?: boolean;
  unpublished?: boolean;
}

export interface CaseListResponse {
  items: CaseListItem[];
  nextCursor: string | null;
}

export interface TimelineEvent {
  id: string;
  occurredAt: string | null;
  occurredAtPrecision: DatePrecision;
  title: string;
  description: string | null;
}

export interface Sentence {
  id: string;
  courtLevel: CourtLevel;
  courtName: string | null;
  type: SentenceType;
  verdict: string | null;
  penalty: string | null;
  isFinal: boolean;
  decidedAt: string | null;
}

export type SentenceVoteChoice = "AGREE" | "DISAGREE";
export type SentenceVoteDirection = "TOO_LENIENT" | "TOO_HARSH";

/** 집계는 투표한 사람에게만 내려옴 (results: null이면 아직 투표 전) */
export interface SentenceVoteState {
  choice: SentenceVoteChoice | null;
  direction: SentenceVoteDirection | null;
  results: {
    agree: number;
    disagree: number;
    total: number;
    tooLenient: number;
    tooHarsh: number;
  } | null;
}

export interface Suspect {
  id: string;
  name: string | null;
  alias: string | null;
  description: string | null;
  charges: string | null;
  status: SuspectStatus;
  identityDisclosedAt: string | null;
  identityDisclosureAgency: string | null;
  identityDisclosureSource: string | null;
  photoUrl: string | null;
  photoSourceAgency: string | null;
  photoSourceUrl: string | null;
  sentences: Sentence[];
}

export interface Victim {
  id: string;
  name: string | null;
  alias: string | null;
  age: number | null;
  gender: Gender;
  description: string | null;
  status: VictimStatus;
}

export interface UnsolvedQuestion {
  id: string;
  question: string;
  description: string | null;
  isResolved: boolean;
  answer: string | null;
}

export interface SuspiciousCircumstance {
  id: string;
  title: string;
  description: string | null;
}

export interface CaseDetail extends CaseListItem {
  overview: string | null;
  victimCountNote: string | null;
  solvedAt: string | null;
  timeline: TimelineEvent[];
  suspects: Suspect[];
  victims: Victim[];
  unsolvedQuestions: UnsolvedQuestion[];
  suspiciousCircumstances: SuspiciousCircumstance[];
  /** 관리실에서 이 사건에 연결해 공개한 최근 기사 */
  newsItems?: CaseNewsItem[];
  /** 다큐·방송·영화·유튜브 등 더 볼거리 */
  relatedContents?: RelatedContent[];
  /** 이 사건 뒤에 바뀐 것(법·기념일·제도) */
  changes?: CaseChange[];
  /** 사건 정리에 쓴 기사·판결·공공기관 자료 (나무위키 제외) */
  sources?: CaseSourceLink[];
  updatedAt?: string;
}

export type RelatedKind =
  | "DOCUMENTARY"
  | "TV_PROGRAM"
  | "YOUTUBE"
  | "PODCAST"
  | "MOVIE"
  | "SERIES"
  | "BOOK";

export interface RelatedContent {
  id: string;
  kind: RelatedKind;
  title: string;
  platform: string;
  creator: string | null;
  url: string;
  releaseYear: number | null;
  language: string;
  note: string | null;
  isDramatized: boolean;
}

export type SourceType = "COURT" | "GOVERNMENT" | "NEWS_AGENCY" | "NEWS" | "BROADCAST" | "OTHER";

export interface CaseSourceLink {
  id: string;
  url: string;
  title: string;
  publisher: string;
  type: SourceType;
  publishedAt: string | null;
}

export interface CaseNewsItem {
  id: string;
  url: string;
  title: string;
  titleKo: string | null;
  publisher: string;
  publishedAt: string | null;
}

export type UserContentStatus = "PUBLISHED" | "HELD" | "BLOCKED" | "HIDDEN";

export interface CaseNoteAnswer {
  id: string;
  body: string;
  createdAt: string;
  /** 무작위 별명 ("바람 37") */
  nickname: string;
  empathyCount: number;
  empathizedByMe: boolean;
  isMine: boolean;
}

export interface CaseNotesState {
  canAsk: boolean;
  questions: {
    questionId: string;
    answerCount: number;
    /** empathyCount: 내 노트가 받은 공감 수 (나에게만 보임) */
    mine: { body: string; status: UserContentStatus; empathyCount: number } | null;
    /** 내 노트를 남겨 다른 사람 노트가 모두 열렸는지 */
    unlocked: boolean;
    /** 열리기 전에는 미리 보기 몇 개만 */
    answers: CaseNoteAnswer[];
  }[];
  myQuestion: { id: string; body: string; status: UserContentStatus } | null;
  userQuestions: {
    id: string;
    body: string;
    curiousCount: number;
    curiousByMe: boolean;
    isMine: boolean;
  }[];
}

export interface CaseNoteSaveResult {
  result: { status: UserContentStatus; message: string };
  notes: CaseNotesState;
}

export type ChangeKind = "LAW" | "DAY" | "SYSTEM";

/** 사건을 계기로 생긴 법·기념일·제도 하나 */
export interface CaseChange {
  id: string;
  kind: ChangeKind;
  name: string;
  year: number | null;
  /** 기념일이면 매년 돌아오는 날 (MM-DD) */
  observedOn: string | null;
  country: Country | null;
  description: string;
  sourceUrl: string;
  sourceTitle: string;
}

/** 모아 보기용: 어느 사건에서 비롯됐는지 함께 */
export interface CaseChangeWithCase extends CaseChange {
  case: { slug: string; title: string; country: Country };
}
