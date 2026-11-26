import { cacheLife } from "next/cache";
import { API_URL } from "@/lib/cases/api";

export interface PoliceCounts {
  source: string;
  /** 데이터포털에서 받은 날 */
  fetchedAt: string;
  rows: { label: string; values: Record<string, number> }[];
}

/** 경찰청 5대 범죄 발생건수. 연 1회 갱신 자료라 서버에서 몇 시간씩 캐시함 (실패는 캐시하지 않음) */
export async function getPoliceCounts(): Promise<PoliceCounts> {
  "use cache";
  cacheLife("hours");
  const res = await fetch(`${API_URL}/stats/police-counts`);
  if (!res.ok) throw new Error(`API 오류 ${res.status}: /stats/police-counts`);
  return (await res.json()) as PoliceCounts;
}
