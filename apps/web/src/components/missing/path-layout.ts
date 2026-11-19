import type { RegionGroup } from "@/lib/missing/regions";
import type { MissingSummary } from "@/lib/missing/types";

/**
 * 구름 길의 칸(slot) 배치. 3D 라이브러리와 무관한 순수 계산이라 테스트·재사용이 쉬움.
 * 길 = [시작] → [지역 표지판, 등불, 등불, ...] × 지역 수 → [끝]
 * slot 인덱스가 곧 곡선 위 위치(u = index / (count - 1))
 */
export type Slot =
  | { kind: "start" }
  | { kind: "sign"; region: string; label: string; count: number }
  | { kind: "lantern"; person: MissingSummary; side: 1 | -1; regionLabel: string }
  | { kind: "end" };

export const SLOT_SPACING = 4;

export function buildSlots(groups: RegionGroup[]): Slot[] {
  const slots: Slot[] = [{ kind: "start" }];
  let side: 1 | -1 = 1;
  for (const g of groups) {
    slots.push({ kind: "sign", region: g.region, label: g.label, count: g.people.length });
    for (const person of g.people) {
      slots.push({ kind: "lantern", person, side, regionLabel: g.label });
      side = side === 1 ? -1 : 1;
    }
  }
  slots.push({ kind: "end" });
  return slots;
}

/** 길 곡선의 제어점: 앞(-z)으로 나아가며 좌우로 완만하게 굽이침. 결정적이라 새로고침해도 같은 길 */
export function controlPoints(count: number): [number, number, number][] {
  return Array.from({ length: count }, (_, i) => [
    Math.sin(i * 0.33) * 5 + Math.sin(i * 0.07) * 3,
    Math.sin(i * 0.21) * 0.5,
    -i * SLOT_SPACING,
  ]);
}

/** 현재 위치(실수 slot)에서 가장 가까운 등불 slot 인덱스. 없으면 -1 */
export function nearestLantern(slots: Slot[], at: number, range = 1.5): number {
  let best = -1;
  let bestDist = range;
  for (let i = Math.max(0, Math.floor(at - range)); i <= Math.min(slots.length - 1, Math.ceil(at + range)); i++) {
    const d = Math.abs(i - at);
    if (slots[i].kind === "lantern" && d <= bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

/** 현재 위치가 속한 지역 이름 (뒤쪽으로 가장 가까운 표지판) */
export function regionAt(slots: Slot[], at: number): string | null {
  for (let i = Math.min(slots.length - 1, Math.round(at)); i >= 0; i--) {
    const s = slots[i];
    if (s.kind === "sign") return s.label;
  }
  return null;
}
