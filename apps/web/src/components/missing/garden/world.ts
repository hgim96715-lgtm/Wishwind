import type { Slot } from "../path-layout";

/**
 * 바닷가 언덕 세계의 지형·배치 계산 (3D 라이브러리와 무관한 순수 함수)
 * 좌표: 앞 = -z. 바다는 왼쪽(x 음수), 오솔길은 언덕 위를 따라 앞으로 이어짐
 * 시작점 근처에 등대와 바람개비 정원이 있음
 */

export const SLOT_SPACING = 4;
export const SEA_LEVEL = 0;

/** z 위치의 해안선 x 좌표: 완만하게 들쭉날쭉 */
export function coastX(z: number): number {
  return -16 + Math.sin(z * 0.018) * 5 + Math.sin(z * 0.051) * 2;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** 지면 높이: 해안에서 언덕으로 올라가고, 언덕 위는 부드럽게 굽이침 */
export function heightAt(x: number, z: number): number {
  const d = x - coastX(z); // 해안선에서 육지 쪽으로 떨어진 거리
  const rise = smooth(-6, 10, d); // 바닷속(음수) → 모래사장 → 언덕
  const hills = 1.6 + Math.sin(x * 0.07 + z * 0.021) * 0.9 + Math.sin(z * 0.043) * 0.7 + Math.sin(x * 0.17) * 0.25;
  return -2.2 + rise * (2.2 + hills);
}

/** 해안선 근처는 모래, 더 안쪽은 풀 (0 = 모래, 1 = 풀) */
export function grassAmount(x: number, z: number): number {
  return smooth(1, 6, x - coastX(z));
}

/** 오솔길 x 좌표: 해안과 나란히 언덕 위를 굽이침 */
export function trailX(i: number): number {
  return Math.sin(i * 0.33) * 3 + Math.sin(i * 0.07) * 2 + 4;
}

export function trailPoint(i: number): [number, number, number] {
  const z = -i * SLOT_SPACING;
  const x = trailX(i);
  return [x, heightAt(x, z), z];
}

/** 길 방향(앞) 단위 벡터 (xz 평면) */
export function trailDir(i: number): [number, number] {
  const [x0, , z0] = trailPoint(i - 0.5);
  const [x1, , z1] = trailPoint(i + 0.5);
  const l = Math.hypot(x1 - x0, z1 - z0) || 1;
  return [(x1 - x0) / l, (z1 - z0) / l];
}

/** 등불 위치: 길 양옆 */
export function lanternPoint(i: number, side: 1 | -1, offset = 1.8): [number, number, number] {
  const [x, , z] = trailPoint(i);
  const [dx, dz] = trailDir(i);
  // 오른쪽 법선 = (-dz, dx)
  const px = x - dz * side * offset;
  const pz = z + dx * side * offset;
  return [px, heightAt(px, pz), pz];
}

/** z 좌표 → 대략적인 slot 인덱스 */
export const slotAtZ = (z: number) => -z / SLOT_SPACING;

/**
 * 시작 광장 (길 시작점 z=0 뒤쪽): 도착하면 앞(-z)으로 바람개비 정원, 왼쪽 앞 해안 곶에 등대,
 * 그 너머로 등불 오솔길이 보이게 배치
 */
export const SPAWN: [number, number] = [0, 27];
export const GARDEN_CENTER: [number, number] = [3, 18];
export const LIGHTHOUSE: [number, number] = [coastX(4) + 9, 4];

/** 바람개비 k번째 자리: 정원 중심에서 해바라기씨 배열(황금각)로 퍼짐 → 겹치지 않고 고르게 */
export function pinwheelSpot(k: number): [number, number, number] {
  const r = 1.4 + Math.sqrt(k) * 0.62;
  const a = k * 2.39996;
  const x = GARDEN_CENTER[0] + Math.cos(a) * r;
  const z = GARDEN_CENTER[1] + Math.sin(a) * r;
  return [x, heightAt(x, z), z];
}

/** 플레이어가 갈 수 있는 범위: 바다에 빠지지 않고, 길 앞뒤 끝을 넘지 않음 */
export function clampToLand(x: number, z: number, slotCount: number): [number, number] {
  const zMin = -(slotCount + 2) * SLOT_SPACING;
  const zc = Math.min(40, Math.max(zMin, z));
  const xc = Math.min(trailX(slotAtZ(zc)) + 22, Math.max(coastX(zc) + 1.5, x));
  return [xc, zc];
}

/** 가장 가까운 등불 (거리 range 이내). 없으면 -1 */
export function nearestLanternAt(slots: Slot[], x: number, z: number, range = 4.5): number {
  const c = Math.round(slotAtZ(z));
  let best = -1;
  let bestD = range;
  for (let i = Math.max(0, c - 2); i <= Math.min(slots.length - 1, c + 2); i++) {
    const s = slots[i];
    if (s.kind !== "lantern") continue;
    const [lx, , lz] = lanternPoint(i, s.side);
    const d = Math.hypot(lx - x, lz - z);
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}
