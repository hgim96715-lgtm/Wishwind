import { cacheLife } from "next/cache";
import { API_URL } from "./api";
import type { CaseChange, CaseChangeWithCase, ChangeKind } from "./types";

export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = { LAW: "법", DAY: "기념일", SYSTEM: "제도" };

/** 기념일 날짜 '12-06' → '매년 12월 6일' */
export function observedLabel(observedOn: string | null) {
  if (!observedOn) return null;
  const [m, d] = observedOn.split("-").map(Number);
  return `매년 ${m}월 ${d}일`;
}

/** '1996년 · 제도' 같은 짧은 설명줄 */
export function changeMeta(c: CaseChange) {
  return [c.year ? `${c.year}년` : null, CHANGE_KIND_LABEL[c.kind], observedLabel(c.observedOn)].filter(Boolean).join(" · ");
}

/** 공개 사건의 '바뀐 것' 전체. API가 꺼져 있으면 빈 목록 (홈·모아 보기가 깨지지 않게) */
export async function getChanges(): Promise<CaseChangeWithCase[]> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch(`${API_URL}/cases/changes`);
    if (!res.ok) return [];
    return ((await res.json()) as { items: CaseChangeWithCase[] }).items;
  } catch {
    return [];
  }
}

/** 오늘(한국 시간)의 '알고 계셨나요?': 오늘이 기념일이면 그것, 아니면 날마다 하나씩 돌아가며 */
export function pickToday(items: CaseChangeWithCase[], now = new Date()) {
  if (items.length === 0) return null;
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const mmdd = kst.toISOString().slice(5, 10);
  const today = items.find((c) => c.kind === "DAY" && c.observedOn === mmdd);
  if (today) return { item: today, isToday: true };
  const dayNumber = Math.floor(kst.getTime() / 86_400_000);
  return { item: items[dayNumber % items.length], isToday: false };
}

/** 오늘의 '알고 계셨나요?' 한 건. 날짜를 쓰므로 캐시 안에서 고름 (몇 시간마다 다시 고름) */
export async function getTodayChange() {
  "use cache";
  cacheLife("hours");
  return pickToday(await getChanges(), new Date());
}
