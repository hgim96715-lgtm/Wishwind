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

/** 연못을 파기 전의 지면 높이: 해안에서 언덕으로 올라가고, 언덕 위는 부드럽게 굽이침 */
function baseHeight(x: number, z: number): number {
  const d = x - coastX(z); // 해안선에서 육지 쪽으로 떨어진 거리
  const rise = smooth(-6, 10, d); // 바닷속(음수) → 모래사장 → 언덕
  // 기본 높이 2.2: 언덕 사이 움푹한 곳이 바다 높이보다 낮아져 들판 한가운데에 물이 차 보이던 문제 (사용자 제보 2026-11-21)
  const hills = 2.2 + Math.sin(x * 0.07 + z * 0.021) * 0.9 + Math.sin(z * 0.043) * 0.7 + Math.sin(x * 0.17) * 0.25;
  return -2.2 + rise * (2.2 + hills);
}

/** 지면 높이 (연못 자리는 오목하게 팸) */
export function heightAt(x: number, z: number): number {
  let h = baseHeight(x, z);
  for (const p of pondsNear(z)) {
    const e = pondDistance(p, x, z);
    if (e < 1.3) h -= POND_DEPTH * (1 - smooth(0.6, 1.3, e));
  }
  return h;
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

/**
 * 등불 위치. 순서(실종일이 최근일수록 앞)는 z로 지키고, 옆 자리는 등불마다 정해진 난수로 고름
 * - 약 35%: 큰길 옆, 약 20%: 갈래 길 바깥 옆 (갈래 길 구간일 때)
 * - 나머지: 언덕 안쪽 들판(최대 길에서 45) 또는 바닷가 쪽 풀밭에 흩어짐 → 어디를 걸어도 등불을 만남
 * offset 0이면 등불 바로 앞 (등불 앞으로 순간 이동할 때 설 자리)
 */
export function lanternPoint(i: number, side: 1 | -1, offset = 1.8): [number, number, number] {
  const r = hash2(i * 0.731, 17.3);
  const baseZ = -i * SLOT_SPACING;

  const bx = branchX(i);
  if (r >= 0.35 && r < 0.55 && bx !== null && bx - trailX(i) > 3) {
    let px = bx + offset;
    // 연못 옆이면 물가 바깥에 세움 (offset 0일 때는 다리 위 길 한가운데)
    if (offset > 0) for (const p of pondsNear(baseZ, 2)) if (Math.abs(baseZ - p.z) < p.rz + 1) px = Math.max(px, p.x + p.rx + 1.2);
    return [px, heightAt(px, baseZ), baseZ];
  }

  if (r >= 0.35) {
    // 들판: 안쪽이 넓으니 대부분 안쪽, 일부는 바닷가 풀밭
    const u = hash2(i * 1.913, 5.1);
    const seaside = hash2(i * 0.377, 2.9) < 0.2;
    const tx = trailX(i);
    let px = seaside ? coastX(baseZ) + 5 + u * Math.max(0, tx - coastX(baseZ) - 9) : tx + 5 + u * 40;
    let pz = baseZ + (hash2(i * 2.71, 8.8) - 0.5) * 2.4;
    // 연못·길 한가운데는 피함
    for (const p of pondsNear(pz, 4)) if (pondDistance(p, px, pz) < 1.4) px = p.x + p.rx * 1.5;
    if (pathAmount(px, pz) > 0.3) px += 2.5;
    if (offset === 0) pz += 1.6; // 등불 바로 앞(시작 쪽)
    return [px, heightAt(px, pz), pz];
  }

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

/**
 * 플레이어가 갈 수 있는 범위: 바다에만 빠지지 않으면 언덕 어디든 걸을 수 있음.
 * 안쪽(육지) 끝은 지형이 그려지는 범위(플레이어 주변 90) 안이라 사실상 벽을 느끼지 않음
 */
export const LAND_INLAND_LIMIT = 70;
export function clampToLand(x: number, z: number, slotCount: number): [number, number] {
  const zMin = -(slotCount + 4) * SLOT_SPACING;
  const zc = Math.min(60, Math.max(zMin, z));
  let xc = Math.min(trailX(slotAtZ(zc)) + LAND_INLAND_LIMIT, Math.max(coastX(zc) + 1.5, x));
  // 해안선 바로 옆은 땅이 바다보다 낮아 몸이 물에 잠겨 보임 → 땅이 바다 위로 올라온 곳까지만 감
  for (let i = 0; i < 40 && heightAt(xc, zc) < SEA_LEVEL + 0.15; i++) xc += 0.25;
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

/* ───────────────────────── 갈래 길 ───────────────────────── */

/**
 * 큰길(trail)에서 갈라져 언덕 안쪽으로 크게 돌았다가 다시 합쳐지는 고리 길.
 * slot LOOP_START + k·LOOP_EVERY 에서 갈라져 LOOP_LEN 칸 뒤에 합쳐짐 (k = 0, 1, 2, …)
 */
const LOOP_START = 3;
const LOOP_EVERY = 16;
const LOOP_LEN = 10;

const loopBulge = (k: number) => 11 + Math.sin(k * 1.7) * 3;

/** slot 위치에서 고리 길의 x 좌표. 고리 길이 없는 구간이면 null */
export function branchX(slot: number): number | null {
  const k = Math.floor((slot - LOOP_START) / LOOP_EVERY);
  if (k < 0) return null;
  const local = slot - (LOOP_START + k * LOOP_EVERY);
  if (local < 0 || local > LOOP_LEN) return null;
  return trailX(slot) + loopBulge(k) * Math.sin((Math.PI * local) / LOOP_LEN);
}

/** 시작 광장에서 뻗는 짧은 길들 (선분 목록). 등대, 큰길 입구, 연못 다리를 지나 큰길로 이어짐 */
const PLAZA_PATHS: [number, number, number, number][] = [
  [SPAWN[0], SPAWN[1], trailX(0), 0],
  [SPAWN[0], SPAWN[1], LIGHTHOUSE[0] + 2, LIGHTHOUSE[1] + 2],
  [SPAWN[0] + 2, SPAWN[1] - 1, 21, 22],
  [21, 22, 21, 3],
  [21, 3, trailX(2), -8],
];

function segmentDistance(px: number, pz: number, [ax, az, bx, bz]: [number, number, number, number]) {
  const vx = bx - ax;
  const vz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

/** 길 위인 정도 (0 = 풀밭, 1 = 길 한가운데). 큰길·고리 길·광장 길 모두 포함 */
export function pathAmount(x: number, z: number): number {
  const slot = slotAtZ(z);
  let d = Infinity;
  if (z < 2) d = Math.abs(x - trailX(slot));
  const bx = branchX(slot);
  if (bx !== null) d = Math.min(d, Math.abs(x - bx) * 0.8);
  if (z > -14) for (const seg of PLAZA_PATHS) d = Math.min(d, segmentDistance(x, z, seg));
  return Math.max(0, 1 - d / 1.6);
}

/* ───────────────────────── 연못과 다리 ───────────────────────── */

export interface Pond {
  id: string;
  x: number;
  z: number;
  /** 반지름 (x·z 방향 따로, 타원) */
  rx: number;
  rz: number;
}

const POND_DEPTH = 1.3;
/** 다리는 늘 z 방향(길 방향)으로 놓임. 연못 끝에서 조금 더 나가서 땅에 닿음 */
export const BRIDGE_HALF_WIDTH = 1.7;

const START_POND: Pond = { id: "start", x: 21, z: 12.5, rx: 5.5, rz: 3.6 };
/** 바로 가기 "연못 다리": 다리 바로 앞 길 위 */
export const START_POND_VIEW: [number, number] = [21, 18.5];

/** 고리 길 두 개 중 하나는 가장 바깥쪽(꼭짓점)에 연못이 있어 다리를 건너게 됨 */
function loopPond(k: number): Pond | null {
  if (k < 0 || k % 2 !== 0) return null;
  const apex = LOOP_START + k * LOOP_EVERY + LOOP_LEN / 2;
  const x = branchX(apex);
  if (x === null) return null;
  return { id: `loop-${k}`, x, z: -apex * SLOT_SPACING, rx: 5 + (k % 3), rz: 3.6 };
}

/** z 근처(±range)에 있는 연못 목록 */
export function pondsNear(z: number, range = 12): Pond[] {
  const list: Pond[] = [];
  if (Math.abs(z - START_POND.z) < range + START_POND.rz) list.push(START_POND);
  const slot = slotAtZ(z);
  const k0 = Math.floor((slot - LOOP_START - range / SLOT_SPACING - LOOP_LEN) / LOOP_EVERY);
  const k1 = Math.floor((slot - LOOP_START + range / SLOT_SPACING) / LOOP_EVERY);
  for (let k = Math.max(0, k0); k <= k1; k++) {
    const p = loopPond(k);
    if (p && Math.abs(z - p.z) < range + p.rz) list.push(p);
  }
  return list;
}

/** 연못 중심에서 타원 기준으로 잰 거리 (1 = 물가) */
export function pondDistance(p: Pond, x: number, z: number) {
  return Math.hypot((x - p.x) / p.rx, (z - p.z) / p.rz);
}

/** 연못 물 높이: 주변 땅보다 조금 낮게 */
export const waterLevel = (p: Pond) => baseHeight(p.x, p.z) - 0.35;

export const bridgeHalfLength = (p: Pond) => p.rz + 1.4;

/** 다리 위 높이 (dz = 다리 가운데부터의 거리). 양 끝은 땅에 닿고 가운데가 둥글게 솟음 */
export function bridgeDeckY(p: Pond, dz: number): number {
  const L = bridgeHalfLength(p);
  const t = Math.max(-1, Math.min(1, dz / L));
  const ends = (baseHeight(p.x, p.z - L) + baseHeight(p.x, p.z + L)) / 2;
  return ends + 0.15 + Math.cos((t * Math.PI) / 2) * 1.0;
}

/** 걷는 높이: 다리 위면 다리 높이, 아니면 지면 */
export function walkHeight(x: number, z: number): number {
  for (const p of pondsNear(z, 6)) {
    const dz = z - p.z;
    if (Math.abs(x - p.x) < BRIDGE_HALF_WIDTH && Math.abs(dz) < bridgeHalfLength(p)) {
      return Math.max(heightAt(x, z), bridgeDeckY(p, dz));
    }
  }
  return heightAt(x, z);
}

/** 물에 들어가는 자리인지 (다리 위는 제외) */
export function inWater(x: number, z: number): boolean {
  for (const p of pondsNear(z, 6)) {
    if (Math.abs(x - p.x) < BRIDGE_HALF_WIDTH && Math.abs(z - p.z) < bridgeHalfLength(p)) return false;
    if (pondDistance(p, x, z) < 1.08) return true; // 물가에서 멈춤 (물 표면 반지름 0.98보다 조금 바깥)
  }
  return false;
}

/** 바람개비를 꽂을 수 있는 자리로 살짝 옮김: 길·물·모래 위면 옆 풀밭으로 */
export function plantableSpot(x: number, z: number): [number, number] {
  for (let r = 0; r <= 6; r += 0.75) {
    for (let a = 0; a < 8; a++) {
      const px = x + Math.cos((a * Math.PI) / 4) * r;
      const pz = z + Math.sin((a * Math.PI) / 4) * r;
      if (!inWater(px, pz) && pathAmount(px, pz) < 0.2 && grassAmount(px, pz) > 0.6) return [px, pz];
      if (r === 0) break;
    }
  }
  return [x, z];
}

/** 같은 입력에 늘 같은 값을 주는 0~1 난수 (꽃·나비 배치용) */
export function hash2(x: number, z: number): number {
  const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
