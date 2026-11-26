import { toQueryString, type CaseFilters } from "./filters";
import type { CaseDetail, CaseListResponse } from "./types";

/**
 * 서버 컴포넌트에서만 호출함 (브라우저 → Next 서버 → NestJS).
 * 브라우저가 API를 직접 부르지 않으므로 CORS 설정이 필요 없음.
 */
export const API_URL = process.env.API_URL ?? "http://localhost:4000/api";

export class ApiUnavailableError extends Error {}
/** 필터 값이 잘못돼 API가 400을 돌려준 경우 */
export class InvalidQueryError extends Error {}

async function request<T>(path: string): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`);
  } catch (cause) {
    // ECONNREFUSED 등: API 서버가 꺼져 있음
    throw new ApiUnavailableError(`API 서버에 연결할 수 없습니다: ${API_URL}`, {
      cause,
    });
  }
  if (res.status === 404) return null;
  if (res.status === 400) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new InvalidQueryError(body?.message ?? "검색 조건이 잘못됐습니다");
  }
  if (!res.ok) throw new Error(`API 오류 ${res.status}: ${path}`);
  return (await res.json()) as T;
}

export async function getCases(filters: CaseFilters = {}): Promise<CaseListResponse> {
  const qs = toQueryString(filters);
  return (
    (await request<CaseListResponse>(`/cases?take=100${qs ? `&${qs}` : ""}`)) ?? {
      items: [],
      nextCursor: null,
    }
  );
}

/** 관리실에서 홈 대표로 지정한 사건 (없으면 빈 목록) */
export async function getHomeFeatured(): Promise<CaseListResponse["items"]> {
  return (await request<{ items: CaseListResponse["items"] }>("/cases/featured"))?.items ?? [];
}

export function getCase(slug: string): Promise<CaseDetail | null> {
  return request<CaseDetail>(`/cases/${encodeURIComponent(slug)}`);
}
