import type {
  BriefingKind,
  BriefingStatus,
  ContentStatus,
  InquiryKind,
  InquiryStatus,
  ReviewStatus,
} from "./types";

export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  DRAFT: "초안",
  NEEDS_REVIEW: "검토 필요",
  VERIFIED: "검증 완료",
  REJECTED: "반려",
};

export const REVIEW_COLOR: Record<ReviewStatus, string> = {
  DRAFT: "#9a9389",
  NEEDS_REVIEW: "#b0832f",
  VERIFIED: "#3f8f84",
  REJECTED: "#c46a4b",
};

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  PUBLISHED: "공개",
  HELD: "보류",
  BLOCKED: "차단",
  HIDDEN: "숨김",
};

export const CONTENT_STATUS_COLOR: Record<ContentStatus, string> = {
  PUBLISHED: "#3f8f84",
  HELD: "#b0832f",
  BLOCKED: "#c46a4b",
  HIDDEN: "#7d746a",
};

export const CONTENT_TYPE_LABEL = {
  answer: "수사 노트 답변",
  question: "사용자 질문",
  cloud: "실종자들의 정원 응원",
} as const;

export const BRIEFING_KIND_LABEL: Record<BriefingKind, string> = {
  NOTICE: "공지사항",
  NEWS: "새 소식",
  CASE_UPDATE: "사건 변경",
  OPINION: "의견 요약",
};

export const BRIEFING_STATUS_LABEL: Record<BriefingStatus, string> = {
  DRAFT: "초안",
  PUBLISHED: "공개",
};

export const INQUIRY_KIND_LABEL: Record<InquiryKind, string> = {
  QUESTION: "문의",
  CORRECTION: "정정 요청",
  FEEDBACK: "의견",
};

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  OPEN: "새로 옴",
  ANSWERED: "답변함",
  CLOSED: "닫음",
};

/** 검사 분류 코드 → 관리자가 읽을 말 */
export const MODERATION_CATEGORY_LABEL: Record<string, string> = {
  NONE: "문제 없음",
  ACCUSATION: "특정인 범인 지목",
  VICTIM_HARM: "피해자·유족 비하",
  PERSONAL_INFO: "개인정보",
  ABUSE: "욕설·혐오",
  UNVERIFIED_CLAIM: "확인 안 된 단정",
  SPAM: "스팸",
  URL: "링크",
  EMAIL: "이메일",
  PHONE: "전화번호",
  ADDRESS: "주소",
  PROTECTED_NAME: "보호 실명",
  NO_API_KEY: "AI 검사 꺼짐 (키 없음)",
  TIMEOUT: "AI 검사 시간 초과",
  RATE_LIMITED: "AI 검사 한도 초과",
  API_ERROR: "AI 검사 오류",
  AUTH_ERROR: "AI 키 오류",
  INVALID_RESPONSE: "AI 응답 오류",
  REFUSAL: "AI가 판단 거부",
  ADMIN: "관리자",
  ADMIN_HIDDEN: "관리자가 숨김",
  REPORT_DISMISSED: "관리자가 신고 기각",
  ADMIN_BLOCKED: "관리자가 차단",
  OTHER: "기타",
};

export const shortId = (id: string) => id.slice(-6);

export function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
