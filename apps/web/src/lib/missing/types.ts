export type MissingSource = "FBI" | "SAFE182";
export type Gender = "MALE" | "FEMALE" | "UNKNOWN";

/** 길가 등불 하나 = 실종자 한 명 (목록 API) */
export interface MissingSummary {
  id: string;
  source: MissingSource;
  name: string;
  gender: Gender;
  missingDate: string | null;
  lastSeenPlace: string | null;
  region: string;
  thumbUrl: string | null;
}

/** 등불을 눌렀을 때 펼쳐지는 카드 (상세 API) */
export interface MissingDetail extends MissingSummary {
  ageAtMissing: number | null;
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
}

export interface PlaceCloudResult {
  status: "PUBLISHED" | "HELD" | "BLOCKED";
  message: string;
  cloudCount: number;
  cloud?: CloudMessage & { status: string };
}
