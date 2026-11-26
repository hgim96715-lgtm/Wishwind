import { cacheLife } from "next/cache";
import { API_URL } from "@/lib/cases/api";

export interface PoliceCounts {
  source: string;
  /** 데이터포털에서 받은 날 */
  fetchedAt: string;
  rows: { label: string; values: Record<string, number> }[];
}

/**
 * 경찰청 5대 범죄 발생건수. 연 1회 갱신 자료라 받으면 몇 시간씩 캐시함.
 * 못 받으면(API가 아직 없거나 꺼짐) 오류를 던지지 않고 null을 줘서 빌드와 페이지가 깨지지 않게 하고, 그 결과는 짧게만 캐시함
 */
export async function getPoliceCounts(): Promise<PoliceCounts | null> {
  "use cache";
  let data: PoliceCounts | null = null;
  try {
    const res = await fetch(`${API_URL}/stats/police-counts`);
    if (res.ok) data = (await res.json()) as PoliceCounts;
  } catch {
    // 연결 실패는 null로 처리
  }
  if (data) cacheLife("hours");
  else cacheLife("seconds");
  return data;
}
