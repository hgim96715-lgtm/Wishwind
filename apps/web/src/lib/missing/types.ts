export type MissingSource = "FBI" | "SAFE182";
export type Gender = "MALE" | "FEMALE" | "UNKNOWN";

/** 길가 등불 하나 = 실종자 한 명 (목록 API) */
export interface MissingSummary {
  lightCount?: number;
  id: string;
  source: MissingSource;
  name: string;
  gender: Gender;
  missingDate: string | null;
  lastSeenPlace: string | null;
  region: string;
  thumbUrl: string | null;
  /** 실종 당시 나이. FBI 자료는 대부분 비어 있음 */
  ageAtMissing: number | null;
}

/** 등불을 눌렀을 때 펼쳐지는 카드 (상세 API) */
export interface MissingDetail extends MissingSummary {
  ageNow: number | null;
  appearance: string | null;
  description: string | null;
  photoUrl: string | null;
  sourceUrl: string;
  sourceLabel: string;
  lastSyncedAt: string;
  tip: { label: string; url: string };
}

export interface MissingListResponse {
  items: MissingSummary[];
  nextCursor: string | null;
}

/** 응원 메시지 한 조각 = 길에 놓인 구름 하나 */
export interface CloudMessage {
  id: string;
  body: string;
  /** 꽂은 사람의 정원 닉네임. 예전 메시지나 닉네임 없이 꽂은 것은 null */
  nickname?: string | null;
  /** 바람개비를 꽂은 언덕 좌표. 예전 메시지는 null (정원 안에 꽂힘) */
  posX?: number | null;
  posZ?: number | null;
  createdAt: string;
}

export interface CloudsResponse {
  cloudCount: number;
  milestones: { sunlight: number; homePath: number };
  clouds: CloudMessage[];
  /** 내가 놓았지만 아직 확인 중인 구름 */
  pending: CloudMessage[];
  /** 내가 꽂아 언덕에 공개된 바람개비 (최근 순) */
  mine?: CloudMessage[];
  /** 오늘(한국 시간) 이미 꽂았는지. 하루에 하나씩만 꽂을 수 있음 */
  placedToday?: boolean;
}

export interface PlaceCloudResult {
  status: "PUBLISHED" | "HELD" | "BLOCKED";
  message: string;
  cloudCount: number;
  cloud?: CloudMessage & { status: string };
}
