import type { CaseCategory, CaseStatus, Country } from "./types";

/** /cases?q=&country=&category=&status=&yearFrom=&yearTo= */
export interface CaseFilters {
  q?: string;
  country?: Country;
  category?: CaseCategory;
  status?: CaseStatus;
  yearFrom?: string;
  yearTo?: string;
}

const KEYS = ["q", "country", "category", "status", "yearFrom", "yearTo"] as const;

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
  return out as CaseFilters;
}

export function hasActiveFilters(f: CaseFilters) {
  return KEYS.some((k) => f[k]);
}

export function toQueryString(f: CaseFilters) {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const v = f[key];
    if (v) params.set(key, v);
  }
  return params.toString();
}
