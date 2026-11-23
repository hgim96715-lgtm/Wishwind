import type {
  CaseCategory,
  CaseClosure,
  CaseStampKey,
  CaseStatus,
  Country,
  CourtLevel,
  DatePrecision,
  SentenceType,
  SuspectStatus,
  VictimStatus,
} from "./types";

export const COUNTRY_LABEL: Record<Country, string> = {
  KR: "🇰🇷 한국",
  US: "🇺🇸 미국",
  JP: "🇯🇵 일본",
  CN: "🇨🇳 중국",
  GB: "🇬🇧 영국",
  OTHER: "🌐 기타",
};

export const CATEGORY_LABEL: Record<CaseCategory, string> = {
  MURDER: "살인",
  MISSING: "실종",
  KIDNAPPING: "납치·유괴",
  SEXUAL_CRIME: "성범죄",
  ROBBERY: "강도",
  ARSON: "방화",
  TERROR: "테러",
  FRAUD: "사기",
  OTHER: "기타",
};

/** 국가별 책장 순서. 여기에 없는 국가는 맨 뒤에 붙음. 중국(CN)은 사건이 적어 사건방에서는 기타로 묶음 */
export const COUNTRY_ORDER: readonly Country[] = ["KR", "US", "JP", "GB", "OTHER"];

/** 사건방에 보이는 국가. 데이터는 CN 그대로 두고 화면에서만 기타로 묶음 */
export const caseRoomCountry = (c: Country): Country => (c === "CN" ? "OTHER" : c);

/** 서류철 책등 색. 같은 책장 안에서 유형이 한눈에 구분되도록 채도를 낮춘 중간 톤 */
export const CATEGORY_COLOR: Record<CaseCategory, string> = {
  MURDER: "#b5654a",
  MISSING: "#3f8f84",
  KIDNAPPING: "#b0832f",
  SEXUAL_CRIME: "#8a5f8f",
  ROBBERY: "#5f7d9a",
  ARSON: "#c2553a",
  TERROR: "#6b6f4a",
  FRAUD: "#4f78a8",
  OTHER: "#7d746a",
};

/**
 * 상태 도장 문구와 색. 미제=테라코타(사건방 포인트색), 진행 중=호박색, 판결 확정=청록, 수사 종결=회청색.
 * '해결'은 좋게 마무리됐다는 인상을 줘서 쓰지 않음
 */
export const CASE_STAMP: Record<CaseStampKey, { label: string; color: string }> = {
  UNSOLVED: { label: "미제", color: "#c46a4b" },
  IN_PROGRESS: { label: "수사 중", color: "#b0832f" },
  VERDICT: { label: "판결 확정", color: "#3f8f84" },
  CLOSED: { label: "수사 종결", color: "#5f7d8a" },
};

export function stampKey(status: CaseStatus, closure: CaseClosure | null | undefined): CaseStampKey {
  if (status !== "SOLVED") return status;
  return closure ?? "VERDICT";
}

export function caseStamp(c: { status: CaseStatus; closure?: CaseClosure | null }) {
  return CASE_STAMP[stampKey(c.status, c.closure)];
}

/** 관리실에서 고르는 DB 상태값. 끝난 사건은 판결 자료에 따라 판결 확정·수사 종결로 자동 표시됨 */
export const STATUS_STAMP: Record<CaseStatus, { label: string; color: string }> = {
  UNSOLVED: CASE_STAMP.UNSOLVED,
  IN_PROGRESS: CASE_STAMP.IN_PROGRESS,
  SOLVED: { label: "종결 (판결 확정·수사 종결 자동)", color: CASE_STAMP.VERDICT.color },
};

export const SUSPECT_STATUS_LABEL: Record<SuspectStatus, string> = {
  SUSPECTED: "용의 선상",
  ARRESTED: "체포",
  INDICTED: "기소",
  CONVICTED: "유죄 확정",
  ACQUITTED: "무죄",
  CLEARED: "혐의 없음",
  DECEASED: "사망",
  AT_LARGE: "미검거",
};

export const VICTIM_STATUS_LABEL: Record<VictimStatus, string> = {
  DECEASED: "사망",
  INJURED: "생존 (부상)",
  MISSING: "실종",
  FOUND_ALIVE: "생존 발견",
  UNKNOWN: "미상",
};

export const COURT_LEVEL_LABEL: Record<CourtLevel, string> = {
  FIRST: "1심",
  APPEAL: "2심",
  SUPREME: "3심",
  OTHER: "기타",
};

export const SENTENCE_TYPE_LABEL: Record<SentenceType, string> = {
  DEATH: "사형",
  LIFE: "무기징역",
  IMPRISONMENT: "징역·금고",
  PROBATION: "집행유예",
  FINE: "벌금",
  ACQUITTAL: "무죄",
  OTHER: "기타",
};

/**
 * 날짜를 정확도에 맞춰 표시함.
 * - DB의 date 컬럼(@db.Date)은 UTC 자정으로 오므로 timeZone "UTC"로 읽어야 하루 밀리지 않음
 * - timestamptz 컬럼(타임라인)은 한국 시간 기준으로 표시함
 */
export function formatCaseDate(
  iso: string | null,
  precision: DatePrecision,
  timeZone: "UTC" | "Asia/Seoul" = "UTC",
): string {
  if (!iso || precision === "UNKNOWN") return "날짜 미상";
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = { timeZone, year: "numeric" };
  if (precision !== "YEAR") options.month = "long";
  if (precision === "DAY") options.day = "numeric";
  return new Intl.DateTimeFormat("ko-KR", options).format(date);
}
