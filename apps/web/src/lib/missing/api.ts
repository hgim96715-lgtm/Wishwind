import { API_URL, ApiUnavailableError } from "@/lib/cases/api";
import type { MissingDetail, MissingListResponse, MissingSummary } from "./types";

const PAGE = 200;
/** 출처마다 따로 받음: 국내 자료가 많아도 FBI 자료가 뒤에서 잘리지 않게 함 */
const SOURCES = [
  { source: "SAFE182" },
  { source: "FBI" },
] as const;

async function request<T>(path: string): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`);
  } catch (cause) {
    throw new ApiUnavailableError(`API 서버에 연결할 수 없습니다: ${API_URL}`, { cause });
  }
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`API 오류 ${res.status}: ${path}`);
  return (await res.json()) as T;
}

/** 서버 컴포넌트 전용: 길에 놓을 실종자 전체를 출처별·커서로 이어 받음 */
export async function getAllMissing(): Promise<MissingSummary[]> {
  const lists = await Promise.all(SOURCES.map(({ source }) => fetchSource(source)));
  // 동기화가 도는 중에 페이지를 받으면 경계가 바뀔 수 있음 → id 기준으로 한 번 더 중복 제거 (React key 중복 방지)
  const seen = new Set<string>();
  return lists.flat().filter((p) => !seen.has(p.id) && !!seen.add(p.id));
}

async function fetchSource(source: string): Promise<MissingSummary[]> {
  const all: MissingSummary[] = [];
  let cursor: string | null = null;
  const cursors=new Set<string>();
  while (true) {
    const qs: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const page: MissingListResponse | null = await request<MissingListResponse>(
      `/missing?source=${source}&take=${PAGE}${qs}`,
    );
    if (!page) break;
    all.push(...page.items);
    if (!page.nextCursor) break;
    if(cursors.has(page.nextCursor))throw new Error("실종자 목록 커서가 반복됨");
    cursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  return all;
}

export function getMissing(id: string): Promise<MissingDetail | null> {
  return request<MissingDetail>(`/missing/${encodeURIComponent(id)}`);
}
