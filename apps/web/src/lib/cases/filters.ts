import type { CaseCategory, CaseStampKey, CaseStatus, Country } from "./types";

/** /cases?q=&country=&category=&status=&related=&yearFrom=&yearTo= */
export interface CaseFilters {
  q?: string;
  country?: Country;
  category?: CaseCategory;
  /** 판결 확정(VERDICT)·수사 종결(CLOSED)도 받음. 예전 주소의 SOLVED는 둘 다 보여 줌 */
  status?: CaseStatus | CaseStampKey;
  /** 관련 콘텐츠가 있는 사건: any·movie·documentary·youtube·book·netflix·prime·disney */
  related?: string;
  yearFrom?: string;
  yearTo?: string;
}

const KEYS = ["q", "country", "category", "status", "related", "yearFrom", "yearTo"] as const;

/**
 * URL 쿼리 → 필터. 값 검증은 API가 하므로(잘못되면 400) 여기선 문자열만 추림.
 * 같은 키가 여러 번 오면(?q=a&q=b) 첫 값만 씀
 */
export function parseCaseFilters(
  sp: Record<string, string | string[] | undefined>,
): CaseFilters {
  const out: Record<string, string> = {};
  for (const key of KEYS) {
    const raw = sp[key];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (value) out[key] = value;
  }
  // 사건방에서 중국은 기타로 묶음. 예전 주소(?country=CN)도 기타로 보여 줌
  if (out.country === "CN") out.country = "OTHER";
  return out as CaseFilters;
}

export function hasActiveFilters(f: CaseFilters) {
  return KEYS.some((k) => f[k]);
}

export function toQueryString(f: CaseFilters) {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const v = f[key];
    if (!v) continue;
    // 판결 확정·수사 종결은 API에 status=SOLVED&closure=로 보냄
    if (key === "status" && (v === "VERDICT" || v === "CLOSED")) {
      params.set("status", "SOLVED");
      params.set("closure", v);
    } else params.set(key, v);
  }
  return params.toString();
}
