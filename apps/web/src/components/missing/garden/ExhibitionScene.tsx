"use client";

import { balloonArt, benchArt, boatArt, flowerPatch, orchardArt, swingArt } from "./MeadowArt";
import { meadowDinosaur, cloudSvg, Billboards, planeSvg, gateSvg, lampSvg, lighthouseSvg, paintTexture, sailsSvg, windmillSvg, rainbowSvg, storyTexture, bushSvg, postboxSvg, flowerCartSvg, type BillboardItem } from "./Storybook";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Weather } from "@/lib/weather/types";
import { Atmosphere, LighthouseBeam } from "./ExpoAtmosphere";
import { ExpoWeather } from "./ExpoWeather";
import type { GardenPhase } from "./expo-environment";

/** 1인칭 둘러보기 정원: 캐릭터 없이 내가 언덕 위 정원에 서 있고, 드래그(관성)로 좌우를 둘러봄 */

/** 풍차 언덕과 등대 언덕 */
const WIND_HILL = { x: -33, z: -43 };
const LIGHT_HILL = { x: 40, z: -62 };
const EYE = 4.4;
const BASE_PITCH = -0.04; // 살짝 올려다봐 하늘과 구름이 보이게
const MAX_PITCH = 0.16;
const GATE_Z = 46;
const FIELD_Z = 36; // 비탈이 시작되는 자리
const START_Z = 70;

/** 시드 기반 난수: 렌더마다 같은 정원 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 오솔길 중심선 */
function pathX(z: number) {
  return 4 * Math.sin(z * 0.065) + 3 * Math.sin(z * 0.027);
}

/** 완만한 언덕 높이 (멀수록 높아져 가장자리가 능선처럼 보임) */
function naturalHeight(x: number, z: number) {
  const far = Math.max(0, -z - 70) * 0.1;
  const side = Math.max(0, Math.abs(x) - 55) * 0.1;
  const mound = (c: { x: number; z: number }, h: number, w: number) => h * Math.exp(-((x - c.x) ** 2 + (z - c.z) ** 2) / w);
  // 내 앞에서 멀어질수록 완만하게 올라가는 비탈 → 멀리 있는 바람개비도 가려지지 않고 한눈에 보임
  const slope = Math.max(0, FIELD_Z - z) * 0.055;
  return (
    slope + Math.sin(x * 0.05) * 0.9 + Math.cos(z * 0.045 + x * 0.03) * 0.8 + far + side - 1 +
    mound(WIND_HILL, 11, 520) + mound(LIGHT_HILL, 13, 600) + mound({ x: 26, z: -22 }, 3.5, 380) + mound({ x: -42, z: -8 }, 3, 300)
  );
}

type Pt = { x: number; z: number };
/** 네 구역: useGardenLanterns의 순서(아이들, 어른들, 오래 기다리는, 바다 건너)와 같음 */
const ZONES: { name: string; color: string; c: Pt; l: Pt }[] = [
  { name: "아이들의 길", color: "#f1c85b", c: { x: -27, z: 4 }, l: { x: -26, z: 7 } },
  { name: "어른들의 길", color: "#d98d66", c: { x: -31, z: -36 }, l: WIND_HILL },
  { name: "오래 기다리는 길", color: "#8b9f91", c: { x: 30, z: -50 }, l: LIGHT_HILL },
  { name: "바다 건너 길", color: "#77a8bf", c: { x: 37, z: -12 }, l: { x: 33, z: 3 } },
];

function yawToward(from: Pt, to: Pt) {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}
function makeView(name: string, z: number, look: Pt) {
  const pos = { x: pathX(z), z };
  return { name, ...pos, yaw: yawToward(pos, look) };
}
/** 구역 간판 자리: 이동점에서 조형물 쪽을 볼 때 살짝 왼쪽 앞 (zone: ZONES 인덱스) */
function signSpot(zone: number, from: Pt) {
  const l = ZONES[zone].l;
  const dx = l.x - from.x;
  const dz = l.z - from.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const fwd = Math.min(12, len * 0.6);
  return { x: from.x + ux * fwd + uz * 0.8, z: from.z + uz * fwd - ux * 0.8 };
}
/** 도착하면 간판과 조형물이 한 화면에 같이 보이게, 둘 사이를 바라봄 */
function zoneView(name: string, z: number, zone: number) {
  const { l, c } = ZONES[zone];
  return makeView(name, z, { x: l.x * 0.78 + c.x * 0.22, z: l.z * 0.78 + c.z * 0.22 });
}
/** 이동점: 입구 → 아이들 → 바다 건너 → 어른들 → 오래 기다리는 (길을 따라 안쪽으로) */
const VIEWS = [
  makeView("입구", START_Z, { x: pathX(GATE_Z), z: GATE_Z - 2 }),
  zoneView("아이들의 길", 33, 0),
  zoneView("바다 건너 길", 20, 3),
  zoneView("어른들의 길", 5, 1),
  zoneView("오래 기다리는 길", -20, 2),
];

/** 세로 화면(폰)에서는 시야를 넓혀 풍차·등대·바람개비가 잘리지 않게 */

const SIGN_SPOTS = [signSpot(0, VIEWS[1]), signSpot(3, VIEWS[2]), signSpot(1, VIEWS[3]), signSpot(2, VIEWS[4])];

/** 샛길: 큰길에서 각 구역 조형물까지 */
const ARCH_EXT = (() => {
  // 아치를 지나 6칸 더 뻗은 곳: 길이 아치 밑을 그대로 통과함
  const from = { x: pathX(20), z: 20 };
  const l = ZONES[0].l;
  const len = Math.hypot(l.x - from.x, l.z - from.z) || 1;
  return { x: l.x + ((l.x - from.x) / len) * 7, z: l.z + ((l.z - from.z) / len) * 7 };
})();
/** 샛길은 끊기지 않고 조형물 둘레를 한 바퀴 도는 길로 이어짐 */
const TRAILS: { from: Pt; ring: { c: Pt; r: number } }[] = [
  { from: { x: pathX(20), z: 20 }, ring: { c: ARCH_EXT, r: 6 } },
  { from: { x: pathX(10), z: 10 }, ring: { c: ZONES[3].l, r: 6.5 } },
  { from: { x: pathX(-12), z: -12 }, ring: { c: ZONES[1].l, r: 9 } },
  { from: { x: pathX(-28), z: -28 }, ring: { c: ZONES[2].l, r: 8 } },
];
const trailEnd = (t: (typeof TRAILS)[number]): Pt => {
  const dx = t.from.x - t.ring.c.x;
  const dz = t.from.z - t.ring.c.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: t.ring.c.x + (dx / len) * t.ring.r, z: t.ring.c.z + (dz / len) * t.ring.r };
};
// 큰길 끝에서도 길이 멈추지 않고 작은 고리로 이어짐
const MAIN_LOOP = { c: { x: pathX(-54), z: -54 }, r: 6 };
/** 길 따라 흩어 놓은 소품 자리: 문 안쪽 꽃수레, 중간쯤 우체국·우체통, 안쪽 그네 */
const PROP_SPOTS = {
  cart: { x: -6, z: 38 },
  postOffice: { x: -24, z: -32 },
  postbox: { x: -19.4, z: -36.6 },
  swing: { x: 30, z: -43 },
};
/** 아이들의 길의 공룡 친구들 (길 가까이에서 길을 바라봄) */
const DINO_SPOTS: { at: Pt; face: number; kind: 0 | 1 }[] = [
  { at: { x: -25, z: 13 }, face: Math.atan2(26, -3), kind: 0 },
  { at: { x: -30, z: 9 }, face: Math.atan2(23, 19), kind: 1 },
];
// 종이 그림의 폭과 지형 삼각형 크기까지 포함해 발치에 평탄한 잔디를 만든다.
const lawnPads = [
  ...DINO_SPOTS.map(d => ({ ...d.at, radius: d.kind === 0 ? 6 : 4 })),
  ...Object.values(PROP_SPOTS).map(p => ({ ...p, radius: 5 })),
  { ...ZONES[3].l, radius: 6 }, { x: pathX(GATE_Z), z: GATE_Z, radius: 9 },
].map(p => ({ ...p, level: naturalHeight(p.x, p.z) }));
function height(x: number, z: number) {
  let y = naturalHeight(x, z);
  for (const pad of lawnPads) {
    if (Math.abs(x - pad.x) >= pad.radius + 4 || Math.abs(z - pad.z) >= pad.radius + 4) continue;
    const d = Math.hypot(x - pad.x, z - pad.z);
    if (d < pad.radius + 4) y = THREE.MathUtils.lerp(pad.level, y, THREE.MathUtils.smoothstep(d, pad.radius, pad.radius + 4));
  }
  return y;
}
function segDist(x: number, z: number, a: Pt, b: Pt) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = THREE.MathUtils.clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
}
/** 길과 그 가장자리 여유 공간인지 (꽃·바람개비 금지 구역) */
function nearPath(x: number, z: number, buf: number) {
  if (z < 60 && z > -70 && Math.abs(x - pathX(z)) < buf) return true;
  if (Math.abs(Math.hypot(x - MAIN_LOOP.c.x, z - MAIN_LOOP.c.z) - MAIN_LOOP.r) < buf + 1.2) return true;
  if (Object.values(PROP_SPOTS).some(q => Math.hypot(x - q.x, z - q.z) < 6 + buf * 0.3)) return true;
  return TRAILS.some(t => segDist(x, z, t.from, trailEnd(t)) < buf + 1.2 || Math.abs(Math.hypot(x - t.ring.c.x, z - t.ring.c.z) - t.ring.r) < buf + 1.2);
}

function ResponsiveFov() {
  useFrame(({ camera, size }) => {
    const c = camera as THREE.PerspectiveCamera;
    const target = size.width / size.height < 1 ? 72 : 52;
    if (Math.abs(c.fov - target) > 0.01) {
      c.fov = target;
      c.updateProjectionMatrix();
    }
  });
  return null;
}

/** 드래그로 둘러보기(손을 떼면 서서히 멈춤) + 이동점으로 부드럽게 걸어가기 */
function DragLook({ paused, reducedMotion, view, reset, walk, onLook, joy, solid, lockLook = false }: { lockLook?: boolean; joy?: { current: { x: number; y: number } }; solid: (x: number, z: number, fromX: number, fromZ: number) => { x: number; z: number }; paused: boolean; reducedMotion: boolean; view: number; reset: number; walk: { x: number; z: number; n: number; view: number; reset: number; keepYaw: boolean; cruise?: boolean; lift?: number } | null; onLook: (x: number, z: number, yaw: number) => void }) {
  const { gl } = useThree();
  const state = useRef({ yaw: 0, pitch: 0, vyaw: 0, vpitch: 0, drag: false, x: 0, y: 0 });
  const rig = useRef({ x: VIEWS[0].x, z: VIEWS[0].z, yaw: VIEWS[0].yaw });
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const held = keys.current;
    const supported = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyS", "KeyA", "KeyD"];
    const down = (event: KeyboardEvent) => {
      if (paused || lockLook || event.metaKey || event.ctrlKey || event.altKey || !supported.includes(event.code)) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true], [role=menu]")) return;
      event.preventDefault();
      held.add(event.code);
    };
    const up = (event: KeyboardEvent) => { held.delete(event.code); };
    const clear = () => held.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [paused, lockLook]);
  const slowRef = useRef(false);
  const cruiseRef = useRef(false);
  const speedRef = useRef(0);
  const liftGoal = useRef(0);
  const lift = useRef(0);
  const goal = useRef({ x: VIEWS[0].x, z: VIEWS[0].z, yaw: VIEWS[0].yaw });
  useEffect(() => {
    slowRef.current = false;
    cruiseRef.current = false;
    liftGoal.current = 0;
    const v = VIEWS[view] ?? VIEWS[0];
    // 지금 보고 있는 방향을 그대로 이어받아 화면이 튀지 않게 함
    rig.current.yaw -= state.current.yaw;
    state.current.yaw = 0;
    state.current.vyaw = 0;
    state.current.pitch = 0;
    state.current.vpitch = 0;
    speedRef.current = 0;

    liftGoal.current = view > 0 ? 0.045 : 0;
    goal.current = { x: v.x, z: v.z, yaw: v.yaw };
  }, [view, reset]);
  useEffect(() => {
    if (!walk || walk.view !== view || walk.reset !== reset) return;
    // 걷는 방향을 바라보며 이동
    const from = { x: rig.current.x, z: rig.current.z };
    const dist = Math.hypot(walk.x - from.x, walk.z - from.z);
    // 보던 방향을 먼저 이어받음 (드래그로 돌려 둔 시선이 갑자기 튀지 않게)
    rig.current.yaw -= state.current.yaw;
    state.current.yaw = 0;
    state.current.vyaw = 0;
    // 앞쪽(±75° 안)으로 걸을 때만 그쪽을 바라봄. 뒤나 옆으로 갈 때는 몸을 돌리지 않음
    const look = rig.current.yaw;
    const want = yawToward(from, walk);
    const diff = Math.atan2(Math.sin(want - look), Math.cos(want - look));
    slowRef.current = walk.keepYaw;
    cruiseRef.current = !!walk.cruise;
    liftGoal.current = walk.lift ?? 0;
    goal.current = { x: walk.x, z: walk.z, yaw: walk.cruise ? yawToward(from, walk) : dist > 3 && !walk.keepYaw && Math.abs(diff) < 1.3 ? want : look };
  }, [walk, view, reset]);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (paused || lockLook) return;
      state.current.drag = true;
      state.current.x = e.clientX;
      state.current.y = e.clientY;
      state.current.vyaw = 0;
      state.current.vpitch = 0;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!state.current.drag) return;
      const k = 0.0058; // 화면 폭 한 번 드래그 ≈ 시야 전체 이상
      const dx = e.clientX - state.current.x;
      const dy = e.clientY - state.current.y;
      state.current.x = e.clientX;
      state.current.y = e.clientY;
      state.current.yaw += dx * k; // 제한 없이 한 바퀴 이상 돌 수 있음
      state.current.pitch = THREE.MathUtils.clamp(state.current.pitch + dy * k * 0.5, -MAX_PITCH, MAX_PITCH);
      state.current.vyaw = dx * k * 60;
      state.current.vpitch = dy * k * 30;
    };
    const up = (e: PointerEvent) => {
      state.current.drag = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl, paused, lockLook]);

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!state.current.drag) {
      const decay = Math.exp(-dt * 3.2);
      state.current.vyaw *= decay;
      state.current.vpitch *= decay;
      state.current.yaw += state.current.vyaw * dt;
      state.current.pitch = THREE.MathUtils.clamp(state.current.pitch + state.current.vpitch * dt, -MAX_PITCH, MAX_PITCH);
    }
    const held = keys.current;
    const axis = (a: string, b: string) => Number(held.has(a) || held.has(b));
    const jv = {
      x: THREE.MathUtils.clamp((joy?.current.x ?? 0) + axis("ArrowRight", "KeyD") - axis("ArrowLeft", "KeyA"), -1, 1),
      y: THREE.MathUtils.clamp((joy?.current.y ?? 0) + axis("ArrowUp", "KeyW") - axis("ArrowDown", "KeyS"), -1, 1),
    };
    if (jv && !paused && Math.hypot(jv.x, jv.y) > 0.08) {
      // 좌우로 밀면 그쪽으로 몸을 돌리고, 위·아래로 밀면 보는 방향으로 앞·뒤로 걸음
      rig.current.yaw -= (Math.abs(jv.x) > 0.08 ? jv.x : 0) * 1.5 * dt;
      const yawNow = rig.current.yaw - state.current.yaw;
      const fwd = jv.y;
      const nx = rig.current.x - Math.sin(yawNow) * fwd * 5.5 * dt;
      const nz = rig.current.z - Math.cos(yawNow) * fwd * 5.5 * dt;
      const ok = solid(nx, nz, rig.current.x, rig.current.z);
      rig.current.x = ok.x;
      rig.current.z = ok.z;
      goal.current = { x: ok.x, z: ok.z, yaw: rig.current.yaw };
      speedRef.current = 0;
    }
    const v = goal.current;
    const a = reducedMotion ? 1 : 1 - Math.exp(-dt * 2.1);
    // 가까울수록 부드럽게 멈추되, 먼 거리는 일정한 걷는 속도(초당 ~16칸)를 넘지 않음
    const mx = v.x - rig.current.x;
    const mz = v.z - rig.current.z;
    const md = Math.hypot(mx, mz);
    if (md > 0.001) {
      // 목표 속도까지 서서히 가속·감속해서 훅 튀지 않게 함 (걷는 속도 상한: 일반 7, 한 걸음 5, 입장 9)
      const cap = cruiseRef.current ? 9 : slowRef.current ? 5 : Math.min(18, 7 + md * 0.2);
      const want = cruiseRef.current ? cap : Math.min(md * 2.1, cap);
      speedRef.current += (want - speedRef.current) * Math.min(1, dt * 3.5);
      const stepLen = reducedMotion ? md : Math.min(md, speedRef.current * dt);
      rig.current.x += (mx / md) * stepLen;
      rig.current.z += (mz / md) * stepLen;
    } else speedRef.current = 0;
    const dy = Math.atan2(Math.sin(v.yaw - rig.current.yaw), Math.cos(v.yaw - rig.current.yaw));
    rig.current.yaw += dy * a;
    const t = performance.now() / 1000;
    const sway = reducedMotion ? 0 : Math.sin(t * 0.5) * 0.004;
    camera.position.set(rig.current.x, height(rig.current.x, rig.current.z) + EYE + lift.current * 18 + (reducedMotion ? 0 : Math.sin(t * 0.9) * 0.02), rig.current.z);
    onLook(rig.current.x, rig.current.z, rig.current.yaw - state.current.yaw);
    lift.current += (liftGoal.current - lift.current) * a;
    camera.rotation.order = "YXZ";
    camera.rotation.set(BASE_PITCH + lift.current - state.current.pitch * 0.6 + sway, rig.current.yaw - state.current.yaw, 0);
  });
  return null;
}

/** 언덕·들판. 정점 색으로 풀빛에 변화를 주고, 풀잎·들꽃을 인스턴스로 뿌림 */
/** 꽃밭: 무리 지어 핀 들꽃 (줄기 + 꽃잎 + 노란 꽃술) */
/** 동화책 그림 속 동글한 꽃덤불 */
function Bushes({ snow }: { snow: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dots = useRef<THREE.InstancedMesh>(null);
  const N = 70;
  const D = 12;
  useEffect(() => {
    const m = ref.current, dm = dots.current;
    if (!m || !dm) return;
    const r = rng(404);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const greens = snow ? ["#f0f5f8", "#e1ebf1"] : ["#6fae5e", "#88bf63", "#a3cc72", "#5c9c58"];
    const flo = ["#ffffff", "#ffd54a", "#ff8fa8", "#ff7a59", "#c4a3f2"];
    let n = 0, guard = 0;
    while (n < N && guard++ < 3000) {
      const x = (r() - 0.5) * 150, z = 34 - r() * 120;
      if (nearPath(x, z, 3.6)) continue;
      if (VIEWS.some(v => Math.hypot(x - v.x, z - v.z) < 5)) continue;
      if (SIGN_SPOTS.some(q => Math.hypot(x - q.x, z - q.z) < 5)) continue;
      if (TREE_SPOTS.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 7)) continue;
      if (DINO_SPOTS.some(d => Math.hypot(x - d.at.x, z - d.at.z) < 6)) continue;
      const sc = 0.9 + r() * 0.9;
      const y = height(x, z);
      o.position.set(x, y + 0.25 * sc, z);
      o.rotation.set(0, r() * 6, 0);
      o.scale.set(sc * 1.3, sc * 0.85, sc * 1.1);
      o.updateMatrix();
      m.setMatrixAt(n, o.matrix);
      c.set(greens[Math.floor(r() * greens.length)]);
      m.setColorAt(n, c);
      const fc = new THREE.Color(flo[Math.floor(r() * flo.length)]);
      for (let k = 0; k < D; k++) {
        const a = r() * 6.28, u = Math.sqrt(r()) * 0.8, v = Math.acos(r() * 0.8 + 0.2);
        const px = x + Math.cos(a) * u * sc * 1.2, pz = z + Math.sin(a) * u * sc * 1;
        o.position.set(px, y + 0.25 * sc + Math.cos(v) * 0.85 * sc * (1 - u * u * 0.6) + 0.05, pz);
        o.rotation.set(0, 0, 0);
        o.scale.setScalar(snow ? 0.0001 : 0.17 + r() * 0.08);
        o.updateMatrix();
        dm.setMatrixAt(n * D + k, o.matrix);
        dm.setColorAt(n * D + k, fc);
      }
      n++;
    }
    for (let i = n; i < N; i++) {
      o.position.set(0, -60, 0); o.scale.setScalar(0.0001); o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      for (let k = 0; k < D; k++) dm.setMatrixAt(i * D + k, o.matrix);
    }
    [m, dm].forEach(x => { x.instanceMatrix.needsUpdate = true; if (x.instanceColor) x.instanceColor.needsUpdate = true; });
  }, [snow]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false} raycast={() => null}>
        <icosahedronGeometry args={[0.8, 2]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh ref={dots} args={[undefined, undefined, N * D]} frustumCulled={false} raycast={() => null}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial roughness={0.8} emissive="#ffffff" emissiveIntensity={0.12} />
      </instancedMesh>
    </group>
  );
}

function Flowers({ still, night }: { still: boolean; night: boolean }) {
  const parts = useMemo(() => {
    const stem = new THREE.CylinderGeometry(0.012, 0.018, 0.7, 4);
    stem.translate(0, 0.35, 0);
    const leaves: THREE.BufferGeometry[] = [stem];
    for (let k = 0; k < 3; k++) {
      const l = new THREE.SphereGeometry(1, 6, 4);
      l.scale(0.2, 0.03, 0.07);
      l.translate(0.17, 0, 0);
      l.rotateZ(0.7);
      l.rotateY(k * 2.1);
      l.translate(0, 0.04 + k * 0.1, 0);
      leaves.push(l);
    }
    const stemL = mergeGeometries(leaves)!;
    const petals: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 6; k++) {
      const g = new THREE.SphereGeometry(1, 6, 4);
      g.scale(0.24, 0.05, 0.15);
      g.translate(0.15, 0, 0);
      g.rotateZ(0.35);
      g.rotateY((k / 6) * Math.PI * 2);
      g.translate(0, 0.7, 0);
      petals.push(g);
    }
    const head = mergeGeometries(petals)!;
    petals.forEach(g => g.dispose());
    const eye = new THREE.SphereGeometry(0.06, 6, 4);
    eye.scale(1, 0.6, 1);
    eye.translate(0, 0.72, 0);
    return { stem: stemL, head, eye };
  }, []);
  const wind = useRef({ value: 0 });
  const mats = useMemo(() => {
    const sway = (shader: { uniforms: Record<string, unknown>; vertexShader: string }) => {
      shader.uniforms.fWind = wind.current;
      shader.vertexShader = "uniform float fWind;\n" + shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x += sin(fWind + instanceMatrix[3].x * .35 + instanceMatrix[3].z * .25) * position.y * .16;",
      );
    };
    const stem = new THREE.MeshStandardMaterial({ color: "#6a9a45", roughness: 1 });
    stem.onBeforeCompile = sway;
    const head = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, emissive: "#ffffff", emissiveIntensity: 0.12, side: THREE.DoubleSide });
    head.onBeforeCompile = sway;
    const eye = new THREE.MeshStandardMaterial({ color: "#f6c640", roughness: 0.9, emissive: "#f6c640", emissiveIntensity: 0.2 });
    eye.onBeforeCompile = sway;
    return { stem, head, eye };
  }, []);
  const stemRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const eyeRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 3600;
  useEffect(() => {
    const stemM = stemRef.current;
    const headM = headRef.current;
    const eyeM = eyeRef.current;
    if (!stemM || !headM || !eyeM) return;
    const m = [stemM, headM, eyeM];
    const r = rng(77);
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    const palette = ["#ff9db8", "#ffd23f", "#ffffff", "#c9a8f0", "#ff8a5c", "#7fb8ff", "#ffb347"].map(c => new THREE.Color(c));
    // 꽃무리 중심: 길과 이동점, 간판 자리는 피함
    const centers: { x: number; z: number; c: number }[] = [];
    let guard = 0;
    while (centers.length < 90 && guard++ < 2000) {
      const x = (r() - 0.5) * 150;
      const z = 34 - Math.sqrt(r()) * 115;
      if (nearPath(x, z, 4.4)) continue;
      if (VIEWS.some(v => Math.hypot(x - v.x, z - v.z) < 4)) continue;
      if (SIGN_SPOTS.some(q => Math.hypot(x - q.x, z - q.z) < 4)) continue;
      if (TREE_SPOTS.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 6)) continue;
      if (DINO_SPOTS.some(d => Math.hypot(x - d.at.x, z - d.at.z) < 5)) continue;
      centers.push({ x, z, c: Math.floor(r() * palette.length) });
    }
    for (let i = 0; i < COUNT; i++) {
      const ctr = centers[i % centers.length];
      const ang = r() * 6.283;
      const rad = Math.sqrt(r()) * 2.1;
      const x = ctr.x + Math.cos(ang) * rad;
      const z = ctr.z + Math.sin(ang) * rad;
      const near = nearPath(x, z, 2.6);
      d.position.set(x, near ? -50 : height(x, z), z);
      d.rotation.set(0, r() * 6.28, 0);
      d.scale.setScalar(0.85 + r() * 0.6);
      d.updateMatrix();
      m.forEach(x2 => x2.setMatrixAt(i, d.matrix));
      col.copy(palette[(ctr.c + (r() < 0.25 ? 1 : 0)) % palette.length]);
      headM.setColorAt(i, col);
    }
    m.forEach(x => { x.instanceMatrix.needsUpdate = true; });
    if (headM.instanceColor) headM.instanceColor.needsUpdate = true;
  }, []);
  useEffect(() => () => {
    parts.stem.dispose(); parts.head.dispose(); parts.eye.dispose();
    mats.stem.dispose(); mats.head.dispose(); mats.eye.dispose();
  }, [parts, mats]);
  useFrame((_, dt) => { if (!still) wind.current.value += Math.min(dt, 0.05) * 1.3; });
  void night;
  return (
    <group>
      <instancedMesh ref={stemRef} args={[parts.stem, mats.stem, COUNT]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={headRef} args={[parts.head, mats.head, COUNT]} frustumCulled={false} raycast={() => null} />
      <instancedMesh ref={eyeRef} args={[parts.eye, mats.eye, COUNT]} frustumCulled={false} raycast={() => null} />
    </group>
  );
}

function Field({ phase, still, snow, onWalk }: { phase: GardenPhase; still: boolean; snow: boolean; onWalk: (x: number, z: number) => void }) {
  const grass = useRef<THREE.InstancedMesh>(null);
  const wind = useRef({ value: 0 });
  const groundTex = useMemo(() => paintTexture("ground", 22, 18), []);
  useEffect(() => () => groundTex.dispose(), [groundTex]);
  const ground = useMemo(() => {
    const g = new THREE.PlaneGeometry(320, 260, 150, 120);
    g.rotateX(-Math.PI / 2);
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const a = new THREE.Color("#93c25f");
    const b = new THREE.Color("#d2de80");
    const c = new THREE.Color("#9dbd62");
    const tmp = new THREE.Color();
    const snowA = new THREE.Color("#f6f9fc");
    const snowB = new THREE.Color("#dbe7f2");
    const meadowTints = ["#e5d594", "#dbb68c", "#b6b8a7", "#a0caba"].map(value => new THREE.Color(value));
    const snowTone = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) - 50;
      pos.setXYZ(i, x, height(x, z), z);
      const n = (Math.sin(x * 0.21) + Math.cos(z * 0.17) + Math.sin((x + z) * 0.09)) / 3;
      const big = Math.sin(x * 0.045 + 1.3) * 0.6 + Math.cos(z * 0.038 - 0.4) * 0.5 + Math.sin((x - z) * 0.025) * 0.4;
      tmp.copy(a).lerp(n > 0 ? b : c, Math.abs(n) * 0.7);
      tmp.lerp(big > 0 ? b : c, Math.min(0.6, Math.abs(big) * 0.5));
      // 볕을 받는 언덕 위쪽일수록 노란빛
      tmp.lerp(b, THREE.MathUtils.clamp(pos.getY(i) / 14, 0, 0.7));
      ZONES.forEach(({ c }, zone) => {
        const distance = ((x - c.x) / 28) ** 2 + ((z - c.z) / 21) ** 2;
        tmp.lerp(meadowTints[zone], 0.56 * Math.exp(-distance));
      });
      if (snow) tmp.lerp(snowTone.copy(snowA).lerp(snowB, (n + 1) / 2), 0.93);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [snow]);

  const bladeGeometry = useMemo(() => {
    // 한 포기(tuft): 휘어진 가는 잎 7장, 밑동은 짙고 끝은 밝게
    const r = rng(3);
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const base = new THREE.Color("#4f7d33");
    const tip = new THREE.Color("#d2e27c");
    const tmp = new THREE.Color();
    for (let k = 0; k < 7; k++) {
      const ang = r() * Math.PI * 2;
      const lean = 0.18 + r() * 0.35;
      const h = 0.55 + r() * 0.5;
      const w = 0.05 + r() * 0.025;
      const ox = (r() - 0.5) * 0.18;
      const oz = (r() - 0.5) * 0.18;
      const dx = Math.cos(ang);
      const dz = Math.sin(ang);
      const nx = -dz;
      const nz = dx;
      const start = pos.length / 3;
      const rows = 4;
      for (let i = 0; i <= rows; i++) {
        const t = i / rows;
        const bend = lean * t * t * h;
        const y = h * t;
        const half = w * (1 - t * 0.92);
        for (const sgn of [-1, 1]) {
          pos.push(ox + dx * bend + nx * half * sgn, y, oz + dz * bend + nz * half * sgn);
          tmp.copy(base).lerp(tip, Math.pow(t, 0.8));
          col.push(tmp.r, tmp.g, tmp.b);
        }
      }
      for (let i = 0; i < rows; i++) {
        const q = start + i * 2;
        idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  const bladeMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
    m.onBeforeCompile = shader => {
      shader.uniforms.lookWind = wind.current;
      shader.vertexShader = "uniform float lookWind;\n" + shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x += sin(lookWind + instanceMatrix[3].x * .3 + instanceMatrix[3].z * .2) * position.y * .22;",
      );
    };
    return m;
  }, []);

  const COUNT = 1500;
  useEffect(() => {
    const mesh = grass.current;
    if (!mesh) return;
    const r = rng(11);
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const edge = i >= 900;
      const zr = edge ? 54 - r() * 120 : 30 - r() * 100;
      const side = r() < 0.5 ? -1 : 1;
      const x = edge ? pathX(zr) + side * (1.85 + r() * 0.7) : (r() - 0.5) * 120;
      const z = zr;
      // 길 위는 비움 (가장자리 포기는 길 바깥에만)
      if (!edge && nearPath(x, z, 2.2)) {
        d.scale.setScalar(0.001);
      } else {
        d.position.set(x, height(x, z - 40 + 40), z);
        d.rotation.set(0, r() * 6.28, 0);
        d.scale.setScalar(edge ? 0.3 + r() * 0.3 : 0.4 + r() * 0.3);
      }
      d.position.set(d.scale.x < 0.01 ? 0 : x, d.scale.x < 0.01 ? -50 : height(x, z), z);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      col.setHSL(0.2 + r() * 0.05, 0.12 + r() * 0.2, 0.72 + r() * 0.3);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useEffect(() => () => { ground.dispose(); bladeGeometry.dispose(); bladeMaterial.dispose(); }, [ground, bladeGeometry, bladeMaterial]);
  useFrame((state, dt) => {
    if (!still) wind.current.value += Math.min(dt, 0.05) * 1.3;
    void state;
  });

  const night = phase === "night";
  return (
    <group>
      <mesh
        geometry={ground}
        receiveShadow
        userData={{ ground: true }}
        onClick={e => { if (e.delta <= 8) { e.stopPropagation(); onWalk(e.point.x, e.point.z); } }}
      >
        <meshStandardMaterial vertexColors map={groundTex} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} roughness={1} emissive={snow ? "#dce8f4" : "#000000"} emissiveIntensity={snow ? 0.34 : 0} />
      </mesh>
      {!snow && <instancedMesh ref={grass} args={[bladeGeometry, bladeMaterial, COUNT]} frustumCulled={false} raycast={() => null} />}
    </group>
  );
}

const TREE_SPOTS: [number, number, number][] = [
  [-48, -6, 0], [-53, -15, 0], [-44, -21, 1], [-57, -29, 0], [-46, -34, 0],
  [52, 10, 0], [58, -2, 0], [50, -21, 1], [60, -36, 0], [54, 24, 0],
  [-27, 40, 0], [-33, 35, 1], [22, 41, 0], [29, 38, 0],
  [-20, -70, 0], [8, -76, 1], [-60, -48, 0], [64, -56, 0],
];

/** 나무 무리: 부드러운 다면체(플랫 셰이딩) 전나무와 둥근 활엽수 */
function Trees({ snow }: { snow: boolean }) {
  const parts = useMemo(() => {
    const r = rng(5);
    const trunk = new THREE.CylinderGeometry(0.16, 0.42, 2.8, 10);
    trunk.translate(0, 1.4, 0);
    const branch = new THREE.CylinderGeometry(0.05, 0.11, 1, 6);
    branch.translate(0, 0.5, 0);
    const blob = new THREE.IcosahedronGeometry(1, 3);
    const mat = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 });
    const leaf = (snow
      ? ["#eef4f8", "#dce8ef", "#f6f9fb", "#cfdfe9", "#e6eff5"]
      : ["#5f9d5a", "#79b162", "#9cc66e", "#4f8c58", "#b5d27a", "#6aa766"]).map(mat);
    const bark = mat(snow ? "#9a8a7c" : "#7d5a3e");
    const items = TREE_SPOTS.map(([x, z, kind]) => {
      const s = 1.35 + r() * 0.6;
      // 수채화 느낌: 크고 작은 둥근 잎덩이를 겹쳐 쌓음
      const n = kind === 0 ? 7 : 9;
      const puffs = Array.from({ length: n }, (_, k) => {
        const t = k / (n - 1);
        const a = r() * 6.28;
        const rad = kind === 0 ? (1 - t) * 1.25 : 0.4 + r() * 1.3;
        return {
          p: [Math.cos(a) * rad, (kind === 0 ? 2.2 + t * 3.8 : 3.4 + r() * 2.2), Math.sin(a) * rad] as [number, number, number],
          s: kind === 0 ? 1.45 - t * 0.85 + r() * 0.2 : 0.95 + r() * 0.55,
          c: Math.floor(r() * leaf.length),
        };
      });
      return { x, z, kind, s, rot: r() * 6.28, lean: (r() - 0.5) * 0.06, puffs };
    });
    return { trunk, branch, blob, leaf, bark, items };
  }, [snow]);
  useEffect(() => () => {
    parts.trunk.dispose(); parts.branch.dispose(); parts.blob.dispose();
    [...parts.leaf, parts.bark].forEach(m => m.dispose());
  }, [parts]);
  const nope = () => null;
  return (
    <group>
      {parts.items.map((t, i) => (
        <group key={i} position={[t.x, height(t.x, t.z) - 0.1, t.z]} scale={t.s} rotation={[t.lean, t.rot, t.lean]}>
          <mesh geometry={parts.trunk} material={parts.bark} raycast={nope} />
          {t.kind === 1 && [[-0.9, 0.6], [0.9, -0.5], [0.2, 0.9]].map(([lx, lz], k) => (
            <mesh key={k} geometry={parts.branch} material={parts.bark} position={[0, 2.4, 0]} rotation={[lz * 0.9, 0, -lx * 0.9]} scale={[1, 1.9, 1]} raycast={nope} />
          ))}
          {t.puffs.map((p, k) => (
            <mesh key={k} geometry={parts.blob} material={parts.leaf[p.c]} position={p.p} scale={[p.s * 1.12, p.s * 0.92, p.s * 1.12]} raycast={nope} />
          ))}
        </group>
      ))}
    </group>
  );
}

function WindStreaks({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const lines = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 18 }, () => {
      const y = 3 + r() * 9;
      const z = 25 - r() * 70;
      const x0 = -60 + r() * 30;
      const len = 12 + r() * 14;
      const pts = Array.from({ length: 28 }, (_, j) => {
        const t = j / 27;
        return new THREE.Vector3(x0 + t * len, y + Math.sin(t * Math.PI * 2 + r()) * 0.35, z);
      });
      const g = new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts).getPoints(48));
      return { g, speed: 1.2 + r() * 1.4, offset: r() * 90 };
    });
  }, []);
  const material = useMemo(() => new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.12, depthWrite: false }), []);
  const items = useMemo(() => lines.map(l => {
    const line = new THREE.Line(l.g, material);
    line.raycast = () => {};
    return { ...l, line };
  }), [lines, material]);
  useEffect(() => () => { lines.forEach(l => l.g.dispose()); material.dispose(); }, [lines, material]);
  useFrame((_, delta) => {
    if (still || !group.current) return;
    const t = performance.now() / 1000;
    group.current.children.forEach((child, i) => {
      const l = items[i];
      child.position.x = ((t * l.speed * 2 + l.offset) % 130) - 20;
    });
    void delta;
  });
  return (
    <group ref={group}>
      {items.map((l, i) => (
        <primitive key={i} object={l.line} />
      ))}
    </group>
  );
}

/** 부드러운 원형 점 텍스처 */
function useSoftDot() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
}

/** 동화책 구름: 수채 그림 구름 그림을 하늘 높이 천천히 흘려보냄 */
function Clouds({ phase, still }: { phase: GardenPhase; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const texes = useMemo(() => Array.from({ length: 10 }, (_, k) => storyTexture(cloudSvg(k))), []);
  const clusters = useMemo(() => {
    const r = rng(612);
    return Array.from({ length: 10 }, (_, i) => ({
      x: (r() - 0.5) * 560,
      y: 95 + r() * 85,
      z: -270 - r() * 150,
      w: 110 + r() * 80,
      k: i % 10,
    }));
  }, []);
  const tint = phase === "night" ? "#7f8fb8" : phase === "sunset" ? "#ffe0c8" : phase === "morning" ? "#fff6ec" : "#ffffff";
  useEffect(() => () => texes.forEach(t => t.dispose()), [texes]);
  useFrame((_, delta) => {
    if (still || !group.current) return;
    group.current.position.x += Math.min(delta, 0.05) * 1.2;
    if (group.current.position.x > 280) group.current.position.x = -280;
  });
  return (
    <group ref={group}>
      {clusters.map((c, i) => (
        <sprite key={i} position={[c.x, c.y, c.z]} scale={[c.w, c.w * 0.46, 1]} raycast={() => null}>
          <spriteMaterial map={texes[c.k]} color={tint} transparent opacity={phase === "night" ? 0.45 : 0.95} depthWrite={false} fog={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

/** 하루에 몇 번, 아주 멀리 하늘을 가로질러 지나가는 비행기. 낮엔 작은 흰 기체와 비행운, 밤엔 깜빡이는 불빛만 보임 */
function Airplane({ phase, still }: { phase: GardenPhase; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const strobe = useRef<THREE.Mesh>(null);
  const flight = useRef({ next: 20, active: false, t: 0, y: 90, dir: 1, z: -260 });
  useFrame((_, delta) => {
    if (still || !group.current) return;
    const f = flight.current;
    const dt = Math.min(delta, 0.05);
    if (!f.active) {
      f.next -= dt;
      group.current.visible = false;
      if (f.next <= 0) {
        f.active = true;
        f.t = 0;
        f.dir = Math.random() < 0.5 ? 1 : -1;
        f.y = 100 + Math.random() * 25;
        f.z = -190 - Math.random() * 60;
      }
      return;
    }
    f.t += dt;
    const x = (f.t * 11 - 190) * f.dir;
    group.current.visible = true;
    group.current.position.set(x, f.y + f.t * 0.4, f.z);
    group.current.scale.set(f.dir, 1, 1);
    if (strobe.current) (strobe.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(f.t * 4) > 0.55 ? 1 : 0.08;
    if (Math.abs(x) > 200) {
      f.active = false;
      f.next = 150 + Math.random() * 300;
    }
  });
  const night = phase === "night";
  const tex = useMemo(() => storyTexture(planeSvg()), []);
  return (
    <group ref={group} visible={false}>
      {/* 동화책 그림 비행기: 카메라 쪽을 보는 판 */}
      <mesh raycast={() => null}>
        <planeGeometry args={[26, 13]} />
        <meshBasicMaterial map={tex} color={night ? "#6c7ea3" : "#ffffff"} transparent alphaTest={0.3} side={THREE.DoubleSide} toneMapped={false} fog={false} />
      </mesh>
      <mesh ref={strobe} position={[-4, 0.5, 0.2]} raycast={() => null}>
        <sphereGeometry args={[night ? 0.5 : 0.001, 8, 8]} />
        <meshBasicMaterial color="#fff6e0" transparent fog={false} />
      </mesh>
    </group>
  );
}

/** 12월에만, 언덕 한쪽에 작은 크리스마스 트리와 따뜻한 전구 */
function ChristmasTree({ still }: { still: boolean }) {
  const bulbs = useRef<THREE.Points>(null);
  const dot = useSoftDot();
  const data = useMemo(() => {
    const r = rng(1225);
    const count = 46;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const y = 0.5 + t * 2.4;
      const rad = (1 - t) * 0.95 + 0.05;
      const a = t * 28 + r() * 0.5;
      pos.set([Math.cos(a) * rad, y, Math.sin(a) * rad], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useEffect(() => () => { data.dispose(); dot.dispose(); }, [data, dot]);
  useFrame(() => {
    const mat = bulbs.current?.material as THREE.PointsMaterial | undefined;
    if (mat && !still) mat.opacity = 0.85 + Math.sin(performance.now() / 700) * 0.12;
  });
  const x = 24;
  const z = -14;
  return (
    <group position={[x, height(x, z), z]} scale={1.15}>
      <mesh position={[0, 0.3, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.1, 0.14, 0.6, 8]} />
        <meshStandardMaterial color="#6e4f33" roughness={1} />
      </mesh>
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[0, 1.05 + i * 0.8, 0]} raycast={() => null}>
          <coneGeometry args={[1.15 - i * 0.3, 1.5, 16]} />
          <meshStandardMaterial color="#4f8a5b" roughness={1} />
        </mesh>
      ))}
      <points ref={bulbs} geometry={data} raycast={() => null}>
        <pointsMaterial map={dot} color="#ffd9a0" size={0.45} sizeAttenuation transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <pointLight position={[0, 1.8, 0]} color="#ffcf8a" intensity={6} distance={9} decay={2} />
      <mesh position={[0, 3.45, 0]} raycast={() => null}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshBasicMaterial color="#ffe3a0" />
      </mesh>
    </group>
  );
}

/** 구불구불 이어지는 오솔길 */
/** 길 리본: 가운데가 살짝 볼록하고 가장자리는 풀색으로 번지며, 끝은 부드럽게 좁아져 사라짐 */
function buildRibbon(pts: { x: number; z: number; w: number }[], snow: boolean) {
  const U = [-1, -0.72, -0.4, 0, 0.4, 0.72, 1];
  const mid = new THREE.Color(snow ? "#f3f6f9" : "#efcfaa");
  const side = new THREE.Color(snow ? "#eaf0f6" : "#e2c497");
  const rim = new THREE.Color(snow ? "#e6edf4" : "#a9b363");
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const uvs: number[] = [];
  let run = 0;
  const tmp = new THREE.Color();
  pts.forEach((pt, i) => {
    if (i > 0) run += Math.hypot(pt.x - pts[i - 1].x, pt.z - pts[i - 1].z);
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    U.forEach(u => {
      const x = pt.x + nx * pt.w * u;
      const z = pt.z + nz * pt.w * u;
      const crown = 0.07 * (1 - u * u);
      pos.push(x, height(x, z) + 0.1 + crown, z);
      const au = Math.abs(u);
      if (au < 0.5) tmp.copy(mid).lerp(side, au * 1.2);
      else tmp.copy(side).lerp(rim, (au - 0.5) * 2);
      col.push(tmp.r, tmp.g, tmp.b);
      uvs.push(u * pt.w * 0.14, run * 0.14);
    });
    if (i < pts.length - 1) {
      for (let k = 0; k < U.length - 1; k++) {
        const q = i * U.length + k;
        idx.push(q, q + U.length, q + 1, q + 1, q + U.length, q + U.length + 1);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const smooth = (a: number, b: number, v: number) => { const t = THREE.MathUtils.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** 큰길의 반폭: 끝(안쪽)에서 부드럽게 좁아짐 */
const MAIN_END = -48;
const mainHalf = (z: number) => (z < MAIN_END ? 0 : 1.7 + 4.8 * Math.exp(-((z - 24) ** 2) / 38));

/** 중심 c, 반지름 r인 고리 길의 점들 (from 쪽에서 시작해 한 바퀴) */
function ringPoints(c: Pt, r: number, from: Pt, w: number) {
  const a0 = Math.atan2(from.z - c.z, from.x - c.x);
  const pts: { x: number; z: number; w: number }[] = [];
  const N = 56;
  for (let i = 0; i <= N; i++) {
    const a = a0 + (i / N) * Math.PI * 2;
    pts.push({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r, w });
  }
  return pts;
}

let PATH_TEX: THREE.Texture | null = null;
function getPathTex() {
  if (!PATH_TEX) PATH_TEX = paintTexture("path", 1, 1);
  return PATH_TEX;
}

function Path({ snow }: { snow: boolean }) {
  const pathTex = getPathTex();
  const geo = useMemo(() => {
    const pts: { x: number; z: number; w: number }[] = [];
    for (let z = 78; z >= MAIN_END; z -= 1.25) pts.push({ x: pathX(z), z, w: mainHalf(z) });
    return buildRibbon(pts, snow);
  }, [snow]);
  const loop = useMemo(() => buildRibbon(ringPoints(MAIN_LOOP.c, MAIN_LOOP.r, { x: pathX(MAIN_END), z: MAIN_END }, 1.25), snow), [snow]);
  const stones = useRef<THREE.InstancedMesh>(null);
  const STONES = 110;
  useEffect(() => {
    const m = stones.current;
    if (!m) return;
    const r = rng(61);
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < STONES; i++) {
      const z = 56 - r() * 140;
      const side = r() < 0.5 ? -1 : 1;
      const hw = mainHalf(z);
      if (hw < 0.5) { d.scale.setScalar(0.0001); d.position.set(0, -50, 0); d.updateMatrix(); m.setMatrixAt(i, d.matrix); continue; }
      const x = pathX(z) + side * (hw * 0.9 + r() * 0.55);
      d.position.set(x, height(x, z) + 0.05, z);
      d.rotation.set(r() * 3, r() * 6, r() * 3);
      const sc = 0.06 + r() * 0.1;
      d.scale.set(sc * (1 + r() * 0.5), sc * 0.7, sc);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      col.setHSL(0.09 + r() * 0.03, 0.12, 0.62 + r() * 0.18);
      m.setColorAt(i, col);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useEffect(() => () => { geo.dispose(); loop.dispose(); }, [geo, loop]);
  return (
    <group>
      <mesh geometry={loop} userData={{ ground: true }} raycast={() => null}>
        <meshStandardMaterial vertexColors map={pathTex} polygonOffset polygonOffsetFactor={-6} polygonOffsetUnits={-6} roughness={1} side={THREE.DoubleSide} emissive={snow ? "#dce8f4" : "#000000"} emissiveIntensity={snow ? 0.3 : 0} />
      </mesh>
      <mesh geometry={geo} userData={{ ground: true }} raycast={() => null}>
        <meshStandardMaterial vertexColors map={pathTex} polygonOffset polygonOffsetFactor={-6} polygonOffsetUnits={-6} roughness={1} side={THREE.DoubleSide} emissive={snow ? "#dce8f4" : "#000000"} emissiveIntensity={snow ? 0.3 : 0} />
      </mesh>
      <instancedMesh ref={stones} args={[undefined, undefined, STONES]} frustumCulled={false} raycast={() => null}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={1} flatShading />
      </instancedMesh>
    </group>
  );
}

/** 사진 속 같은 따뜻한 나무 풍차: 위로 갈수록 좁은 몸통, 원뿔 지붕, 격자 날개 네 장 */
function Windmill({ still }: { still: boolean }) {
  const hub = useRef<THREE.Group>(null);
  const sails = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => storyTexture(sailsSvg()), []);
  useFrame(({ camera }, delta) => {
    const g = hub.current;
    if (g && g.parent) {
      // 카메라 쪽으로 1.6칸 내밀어 몸통 그림 앞에 확실히 그려지게 함
      const dx = camera.position.x - g.parent.position.x;
      const dz = camera.position.z - g.parent.position.z;
      const len = Math.hypot(dx, dz) || 1;
      g.position.set((dx / len) * 1.6, 12.1, (dz / len) * 1.6);
      g.rotation.y = Math.atan2(dx, dz);
    }
    if (!still && sails.current) sails.current.rotation.z -= Math.min(delta, 0.05) * 0.4;
  });
  // 풍차 몸통 그림은 StoryProps가 세움. 여기는 도는 날개 그림만(몸통 앞쪽 허브 높이)
  return (
    <group ref={hub} position={[0, 12.1, 1.6]}>
      <mesh ref={sails} raycast={() => null} userData={{ noShadow: true }} renderOrder={5}>
        <planeGeometry args={[14, 14]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.3} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** 흰 몸통에 빨간 띠를 두른 등대. 밤엔 꼭대기 불빛이 따뜻하게 켜지고 빛줄기가 천천히 돎 */
function Lighthouse({ phase, still }: { phase: GardenPhase; still: boolean }) {
  const night = phase === "night" || phase === "sunset";
  const dot = useSoftDot();
  useEffect(() => () => dot.dispose(), [dot]);
  // 몸통 그림은 StoryProps가 세움. 여기는 밤의 등불과 빛줄기만
  return (
    <group>
      {night && (
        <sprite position={[0, 21.3, 0.5]} scale={[8, 8, 1]} raycast={() => null}>
          <spriteMaterial map={dot} color="#ffd58a" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </sprite>
      )}
      <group position={[0, 21.3, 0]} scale={0.6}>
        <LighthouseBeam night={phase === "night"} reducedMotion={still} garden />
      </group>
    </group>
  );
}

const WOOD = "#9a6a42";

const FONT = '"Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';

/** 글자를 그려 나무 팻말 판에 붙임 */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function roundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** 구역 안내 간판: 둥글고 부드러운 손그림 느낌의 나무 팻말 */
function ZoneSign({ at, face, name, color, count, still }: { at: Pt; face: number; name: string; color: string; count: number; still: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    // 따뜻한 크림 바탕, 위에서 아래로 번지는 구역 색
    roundRectPath(ctx, 0, 0, 1024, 512, 90);
    ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#fff7e0");
    g.addColorStop(1, "#f6e6bd");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);
    const band = ctx.createLinearGradient(0, 0, 0, 190);
    band.addColorStop(0, color);
    band.addColorStop(1, "rgba(255,247,224,0)");
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, 1024, 190);
    ctx.globalAlpha = 1;
    // 모서리의 작은 잎과 꽃
    const leaf = (x: number, y: number, a: number) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = "#8fb06a";
      ctx.beginPath(); ctx.ellipse(0, 0, 38, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    leaf(70, 70, -0.6); leaf(105, 48, 0.2); leaf(954, 70, 0.6); leaf(919, 48, -0.2);
    ctx.fillStyle = "#ffffff";
    for (const [x, y] of [[48, 110], [976, 110]]) {
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.2566) * 14, y + Math.sin(k * 1.2566) * 14, 11, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#f6c640"; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ffffff";
    }
    ctx.strokeStyle = "#d9b990";
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 12]);
    roundRectPath(ctx, 17, 17, c.width - 34, c.height - 34, 54);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#5b4128";
    let size = 118;
    ctx.font = `650 ${size}px ${FONT}`;
    while (ctx.measureText(name).width > 780 && size > 50) { size -= 6; ctx.font = `650 ${size}px ${FONT}`; }
    ctx.fillText(name, 512, 230);
    // 이름 밑 물결 줄
    ctx.strokeStyle = color;
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let x = 330; x <= 694; x += 4) { const y = 322 + Math.sin((x - 330) / 24) * 6; if (x === 330) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = "#7a6140";
    ctx.font = `600 58px ${FONT}`;
    ctx.fillText(count > 0 ? `바람개비 ${count}개가 돌고 있어요` : "바람을 기다리고 있어요", 512, 413);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [name, color, count]);
  const frame = useMemo(() => new THREE.ExtrudeGeometry(roundedShape(4.7, 2.5, 0.55), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 10 }), []);
  const face2 = useMemo(() => new THREE.ShapeGeometry(roundedShape(4.4, 2.2, 0.5), 10), []);
  useEffect(() => () => { tex.dispose(); frame.dispose(); face2.dispose(); }, [tex, frame, face2]);
  // 로컬 UV: 도형 좌표 → 0..1
  useMemo(() => {
    const p = face2.getAttribute("position");
    const uv = face2.getAttribute("uv");
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 4.4 + 0.5, p.getY(i) / 2.2 + 0.5);
    uv.needsUpdate = true;
  }, [face2]);
  return (
    <group position={[at.x, height(at.x, at.z), at.z]} rotation={[0, face, 0]} scale={0.75}>
      {/* 굵은 기둥 하나, 위에 안전하게 꽂힌 작은 바람개비 */}
      <mesh position={[0, 1.7, -0.25]} raycast={() => null}>
        <cylinderGeometry args={[0.2, 0.28, 3.4, 10]} />
        <meshStandardMaterial color="#a77c52" roughness={1} />
      </mesh>
      <mesh position={[0, 3.55, -0.25]} raycast={() => null}>
        <sphereGeometry args={[0.24, 10, 8]} />
        <meshStandardMaterial color="#a77c52" roughness={1} />
      </mesh>
      <mesh position={[0, 3.9, -0.25]} raycast={() => null}>
        <cylinderGeometry args={[0.03, 0.035, 0.8, 6]} />
        <meshStandardMaterial color="#b78c60" roughness={1} />
      </mesh>
      <MiniPinwheel at={[0, 4.4, -0.17]} color={color} scale={1.05} still={still} />
      {/* 기둥에 달린 둥근 팻말 */}
      <group position={[0, 2.35, 0]}>
        <mesh geometry={frame} position={[0, 0, -0.18]} raycast={() => null}>
          <meshStandardMaterial color="#d2ad88" roughness={1} />
        </mesh>
        <mesh geometry={face2} position={[0, 0, 0.12]} raycast={() => null}>
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>
      {/* 발치의 작은 꽃 */}
      {[[-0.7, 0.2, 0.1], [0.6, 0.3, 0.15], [0.2, -0.4, 0.2], [-0.35, -0.5, 0.1]].map(([x, z, h], i) => (
        <mesh key={i} position={[x, 0.18 + h, z + 0.35]} raycast={() => null}>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshStandardMaterial color={["#ffb7c9", "#fff0b8", "#ffffff", "#d9c4f5"][i]} roughness={0.9} emissive={["#ffb7c9", "#fff0b8", "#ffffff", "#d9c4f5"][i]} emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  );
}

/** 작은 장식용 바람개비 */
function MiniPinwheel({ at, color = "#ff8a65", scale = 1, still }: { at: [number, number, number]; color?: string; scale?: number; still: boolean }) {
  const rotor = useRef<THREE.Group>(null);
  const blade = getBlade();
  useFrame((_, dt) => {
    if (!still && rotor.current) rotor.current.rotation.z -= Math.min(dt, 0.05) * 1.1;
  });
  return (
    <group position={at} scale={scale}>
      <group ref={rotor}>
        {[0, 1, 2, 3].map(k => (
          <mesh key={k} geometry={blade} rotation={[0, 0, (k * Math.PI) / 2]} raycast={() => null}>
            <meshStandardMaterial color={k % 2 ? "#fff3d6" : color} emissive={k % 2 ? "#fff3d6" : color} emissiveIntensity={0.25} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}


/** 입구 문: 두 기둥과 지붕보, 걸린 팻말, 양옆 낮은 울타리 */
function Gate({ night, still, dot }: { night: boolean; still: boolean; dot: THREE.Texture }) {
  const cx = pathX(GATE_Z);
  const y = height(cx, GATE_Z);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 320;
    const ctx = c.getContext("2d")!;
    roundRectPath(ctx, 0, 0, 1024, 320, 70);
    ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, 320);
    g.addColorStop(0, "#fff7e0");
    g.addColorStop(1, "#f6e6bd");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 320);
    ctx.strokeStyle = "#d9b990";
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 12]);
    roundRectPath(ctx, 17, 17, c.width - 34, c.height - 34, 54);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#5b4128";
    ctx.font = `650 105px ${FONT}`;
    ctx.fillText("실종자들의 정원", 512, 130);
    ctx.fillStyle = "#7a6140";
    ctx.font = `600 52px ${FONT}`;
    ctx.fillText("천천히 걸으며 기억해 주세요", 512, 245);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  const gateTex = useMemo(() => storyTexture(gateSvg()), []);
  const frame = useMemo(() => new THREE.ExtrudeGeometry(roundedShape(6.5, 2.1, 0.6), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 10 }), []);
  const face = useMemo(() => {
    const g = new THREE.ShapeGeometry(roundedShape(6.2, 1.8, 0.55), 10);
    const p = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 6.2 + 0.5, p.getY(i) / 1.8 + 0.5);
    return g;
  }, []);
  useEffect(() => () => { tex.dispose(); frame.dispose(); face.dispose(); }, [tex, frame, face]);
  return (
    <group>
      <group position={[cx, y, GATE_Z]}>
        <mesh position={[0, 5.4, 0]} raycast={() => null} userData={{ noShadow: true }}>
          <planeGeometry args={[14.85, 10.8]} />
          <meshBasicMaterial map={gateTex} transparent alphaTest={0.3} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <group position={[0, 5.75, 0.12]}>
          <mesh geometry={frame} position={[0, 0, -0.18]} raycast={() => null}>
            <meshStandardMaterial color="#d2ad88" roughness={1} />
          </mesh>
          <mesh geometry={face} position={[0, 0, 0.12]} raycast={() => null}>
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        </group>
        {/* 문 양옆 등 */}
        {[-3.5, 3.5].map(x => (
          <sprite key={x} position={[x, 4.0, 0.5]} scale={[night ? 1.6 : 0.01, night ? 1.6 : 0.01, 1]} raycast={() => null}>
            <spriteMaterial map={dot} color="#ffd58a" transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
          </sprite>
        ))}
      </group>
    </group>
  );
}

function LampPost({ at, night, dot }: { at: Pt; night: boolean; dot: THREE.Texture }) {
  // 기둥 그림은 StoryProps가 세움. 여기는 밤의 불빛만
  if (!night) return null;
  return (
    <group position={[at.x, height(at.x, at.z), at.z]}>
      {/* 전구 불빛(1.6)만큼만 퍼지게 함: 전엔 3.4라 가로등 하나하나가 안개/먼지 뭉치처럼 보였음 */}
      <sprite position={[0, 3.55, 0.2]} scale={[1.6, 1.6, 1]} raycast={() => null}>
        <spriteMaterial map={dot} color="#ffd18a" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
    </group>
  );
}

/** 쉬어 가는 벤치 (길 쪽을 향함) */
function Bench({ at, face }: { at: Pt; face: number }) {
  const seat = "#c99a62";
  const frame = "#8f6a43";
  return (
    <group position={[at.x, height(at.x, at.z) - 0.02, at.z]} rotation={[0, face, 0]} scale={1.6}>
      {/* 좌판: 나무판 세 장 */}
      {[-0.19, 0, 0.19].map(z => (
        <mesh key={z} position={[0, 0.52, z]} raycast={() => null}>
          <boxGeometry args={[2.2, 0.07, 0.17]} />
          <meshStandardMaterial color={seat} roughness={1} />
        </mesh>
      ))}
      {/* 등받이: 약간 뒤로 눕힌 나무판 세 장 */}
      {[0.7, 0.86, 1.02].map(y => (
        <mesh key={y} position={[0, y, -0.3 - (y - 0.7) * 0.18]} rotation={[-0.2, 0, 0]} raycast={() => null}>
          <boxGeometry args={[2.2, 0.12, 0.04]} />
          <meshStandardMaterial color={seat} roughness={1} />
        </mesh>
      ))}
      {/* 양옆 다리·팔걸이 */}
      {[-1, 1].map(side => (
        <group key={side} position={[side * 1.02, 0, 0]}>
          <mesh position={[0, 0.25, 0.22]} raycast={() => null}>
            <boxGeometry args={[0.09, 0.5, 0.09]} />
            <meshStandardMaterial color={frame} roughness={1} />
          </mesh>
          <mesh position={[0, 0.5, -0.24]} rotation={[-0.2, 0, 0]} raycast={() => null}>
            <boxGeometry args={[0.09, 1.04, 0.09]} />
            <meshStandardMaterial color={frame} roughness={1} />
          </mesh>
          <mesh position={[0, 0.75, -0.02]} raycast={() => null}>
            <boxGeometry args={[0.1, 0.05, 0.56]} />
            <meshStandardMaterial color={frame} roughness={1} />
          </mesh>
          <mesh position={[0, 0.62, 0.22]} raycast={() => null}>
            <boxGeometry args={[0.07, 0.25, 0.07]} />
            <meshStandardMaterial color={frame} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 아이들의 길: 무지개 아치와 양쪽 작은 바람개비 */
/** 아이들의 길: 파스텔 무지개 아치 (양쪽 발치에 구름 뭉치) */
function RainbowArch({ still }: { still: boolean }) {
  const tex = useMemo(() => storyTexture(rainbowSvg()), []);
  void still;
  // 걸어서 통과하는 그림 무지개: 양쪽 발치는 구름
  return (
    <mesh position={[0, 3.35, 0]} raycast={() => null} userData={{ noShadow: true }}>
      <planeGeometry args={[11, 6.1]} />
      <meshBasicMaterial map={tex} transparent alphaTest={0.3} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

/** 둥글고 귀여운 공룡 (직접 만든 모양). kind 0 = 목 긴 초식 공룡, 1 = 뿔 세 개 공룡 */

/** 광장 한가운데 큰 바람개비 조형물 */
function PlazaPinwheel({ still }: { still: boolean }) {
  const rotor = useRef<THREE.Group>(null);
  const blade = getBlade();
  useFrame((_, dt) => {
    if (!still && rotor.current) rotor.current.rotation.z -= Math.min(dt, 0.05) * 0.5;
  });
  const colors = ["#ff8a65", "#fff0cf", "#6fd0c0", "#ffd166"];
  return (
    <group>
      <mesh position={[0, 0.12, 0]} raycast={() => null}>
        <cylinderGeometry args={[3.4, 3.7, 0.24, 28]} />
        <meshStandardMaterial color="#e2d3ac" roughness={1} />
      </mesh>
      <mesh position={[0, 4.2, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.14, 0.2, 8.4, 10]} />
        <meshStandardMaterial color={WOOD} roughness={0.9} />
      </mesh>
      <group position={[0, 8.2, 0.2]} ref={rotor} scale={4.6}>
        {colors.map((c, k) => (
          <mesh key={k} geometry={blade} rotation={[0, 0, (k * Math.PI) / 2]} raycast={() => null}>
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.22} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.22]} raycast={() => null}>
          <sphereGeometry args={[0.08, 10, 8]} />
          <meshStandardMaterial color="#d6ae68" metalness={0.3} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/** 샛길: 본 길에서 각 구역으로 갈라지는 길 */
function Trail({ t, snow }: { t: (typeof TRAILS)[number]; snow: boolean }) {
  const pathTex = getPathTex();
  const geo = useMemo(() => {
    const to = trailEnd(t);
    const segs = 26;
    const dx = to.x - t.from.x;
    const dz = to.z - t.from.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const pts: { x: number; z: number; w: number }[] = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      pts.push({ x: t.from.x + dx * u + Math.sin(u * Math.PI * 2) * 1.2 * nx, z: t.from.z + dz * u + Math.sin(u * Math.PI * 2) * 1.2 * nz, w: 1.25 });
    }
    const ring = ringPoints(t.ring.c, t.ring.r, to, 1.25);
    return [buildRibbon(pts, snow), buildRibbon(ring, snow)];
  }, [t, snow]);
  useEffect(() => () => { geo.forEach(g => g.dispose()); }, [geo]);
  return (
    <>
      {geo.map((g, i) => (
        <mesh key={i} geometry={g} userData={{ ground: true }} raycast={() => null}>
          <meshStandardMaterial vertexColors map={pathTex} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} roughness={1} side={THREE.DoubleSide} emissive={snow ? "#dce8f4" : "#000000"} emissiveIntensity={snow ? 0.3 : 0} />
        </mesh>
      ))}
    </>
  );
}

/** 길 위에 놓인 작은 표식으로 구역 이동을 안내한다. */
function Hotspots({ view, onView }: { view: number; onView: (i: number) => void }) {
  return (
    <group>
      {VIEWS.map((v, i) => {
        if (i === view || i === 0) return null;
        const zoneIdx = [-1, 0, 3, 1, 2][i];
        const color = ZONES[zoneIdx]?.color ?? "#fff0c4";
        return (
          <group key={v.name} position={[v.x, height(v.x, v.z) + 0.18, v.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
              <ringGeometry args={[0.55, 0.68, 24]} />
              <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} />
            </mesh>
            <mesh
              position={[0, 0.9, 0]}
              onClick={e => { e.stopPropagation(); if (e.delta <= 6) onView(i); }}
              onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { document.body.style.cursor = ""; }}
            >
              <cylinderGeometry args={[1.4, 1.4, 1.8, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** 전시 공간 전체: 입구, 길, 구역 조형물과 팻말, 광장, 벤치, 가로등 */
/** 동화책 그림 소품: 나무, 꽃무더기, 꽃덤불, 공룡, 지구본을 그림 판으로 세움 */
function StoryProps({ phase, snow, still, avoid }: { phase: GardenPhase; snow: boolean; still: boolean; avoid: { x: number; z: number }[] }) {
  const tint = snow ? "#eef3fb" : phase === "night" ? "#6c7ea3" : phase === "sunset" ? "#ffd2b0" : phase === "morning" ? "#fff0e4" : "#ffffff";
  const items = useMemo(() => {
    const out: BillboardItem[] = [];
    const r = rng(2024);
    TREE_SPOTS.forEach(([x, z], i) => {
      const tree = { svg: orchardArt(i % 3), aspect: 1.2, h: 7.5 + r() * 3 };
      out.push({ ...tree, x, z, y: height(x, z), flip: i % 3 === 0, sway: 0.008 });
    });
    if (!snow) {
      const fl = Array.from({ length: 8 }, (_, i) => flowerPatch(i));
      const fc = Array.from({ length: 10 }, (_, i) => flowerPatch(i + 1));
      const bu = [0, 1, 2, 3].map(i => bushSvg(77 + i, i));
      const ok = (x: number, z: number, pad: number) =>
        !nearPath(x, z, 3.4) &&
        !VIEWS.some(v => Math.hypot(x - v.x, z - v.z) < 5) &&
        !SIGN_SPOTS.some(q => Math.hypot(x - q.x, z - q.z) < 5) &&
        !TREE_SPOTS.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < pad) &&
        !DINO_SPOTS.some(d => Math.hypot(x - d.at.x, z - d.at.z) < 6) &&
        !ZONES.some(zn => Math.hypot(x - zn.l.x, z - zn.l.z) < 8) &&
        !avoid.some(q => Math.hypot(x - q.x, z - q.z) < 2.6);
      let n = 0, guard = 0;
      while (n < 260 && guard++ < 6000) {
        const x = (r() - 0.5) * 160, z = GATE_Z - 3 - Math.sqrt(r()) * 128;
        if (!ok(x, z, 6)) continue;
        if (r() < 0.65) out.push({ svg: fl[Math.floor(r() * fl.length)], x, z, y: height(x, z) - 0.05, h: 1.5 + r() * 1.0, aspect: 1.2, flip: r() < 0.5, sway: 0.03 });
        else out.push({ svg: fc[Math.floor(r() * fc.length)], x, z, y: height(x, z) - 0.05, h: 1.8 + r() * 1.0, aspect: 1.2, flip: r() < 0.5, sway: 0.03 });
        n++;
      }
      n = 0; guard = 0;
      while (n < 45 && guard++ < 4000) {
        const x = (r() - 0.5) * 160, z = GATE_Z - 3 - Math.sqrt(r()) * 128;
        if (!ok(x, z, 7)) continue;
        out.push({ svg: bu[Math.floor(r() * bu.length)], x, z, y: height(x, z) - 0.05, h: 1.7 + r() * 1.0, aspect: 360 / 240, flip: r() < 0.5 });
        n++;
      }
    }
    const sauro = meadowDinosaur(false);
    const calf = meadowDinosaur(true);
    DINO_SPOTS.forEach(d => {
      out.push(d.kind === 0
        ? { svg: sauro, x: d.at.x, z: d.at.z, y: height(d.at.x, d.at.z), h: 5.8, aspect: 320 / 220 }
        : { svg: calf, x: d.at.x, z: d.at.z, y: height(d.at.x, d.at.z), h: 3.5, aspect: 320 / 220 });
    });
      const Wm = ZONES[1].l, Lh = ZONES[2].l;
    out.push({ svg: windmillSvg(), x: Wm.x, z: Wm.z, y: height(Wm.x, Wm.z) - 0.3, h: 17, aspect: 400 / 560 });
    out.push({ svg: lighthouseSvg(), x: Lh.x, z: Lh.z, y: height(Lh.x, Lh.z) - 0.3, h: 26, aspect: 300 / 800 });
    const bench = benchArt;
    [[pathX(24) + 7.5, 24], [-18, -29], [30, -39]].forEach(([x, z]) => {
      out.push({ svg: bench, x, z, y: height(x, z), h: 2.1, aspect: 1.2 });
    });
    // 소품: 길 따라 흩어 둠 (꽃수레는 문 안쪽, 우체국·우체통은 중간, 그네는 안쪽)
    const put = (svg: string, p: Pt, h: number, aspect: number) => out.push({ svg, x: p.x, z: p.z, y: height(p.x, p.z), h, aspect });
    put(flowerCartSvg(), PROP_SPOTS.cart, 2.2, 380 / 280);
    put(postboxSvg(), PROP_SPOTS.postbox, 2.5, 170 / 300);
    put(swingArt, PROP_SPOTS.swing, 4.2, 1.2);
    const lamp = lampSvg();
    [52, 19, 7, -10, -17].forEach((z, i) => {
      const x = pathX(z) + (i % 2 ? 3.4 : -3.4 * (z === 52 ? 1.9 : 1));
      out.push({ svg: lamp, x, z, y: height(x, z), h: 4.4, aspect: 140 / 420 });
    });
    const G = ZONES[3].l;
    out.push({ svg: boatArt, x: G.x, z: G.z, y: height(G.x, G.z), h: 6.2, aspect: 1.2 });
    return out;
  }, [snow, avoid]);
  return <Billboards items={items} tint={tint} still={still} />;
}

/** 먼 능선 위에서 바람을 타는 천 조각 열기구. */
function HillBalloon({ still }: { still: boolean }) {
  const balloon = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (still || !balloon.current) return;
    elapsed.current += Math.min(delta, 0.1);
    balloon.current.position.y = Math.sin(elapsed.current * 0.35) * 0.55;
    balloon.current.rotation.z = Math.sin(elapsed.current * 0.22) * 0.035;
  });
  return <group position={[-9, height(-9, -73) + 22, -73]}>
    <group ref={balloon}>
      <sprite scale={[19, 16, 1]} raycast={() => null}><spriteMaterial map={storyTexture(balloonArt)} transparent toneMapped={false} depthWrite={false} /></sprite>
    </group>
  </group>;
}

function Scenery({ phase, still, view, onView, counts, snow }: { phase: GardenPhase; still: boolean; view: number; onView: (i: number) => void; counts: number[]; snow: boolean }) {
  const dot = useSoftDot();
  useEffect(() => () => dot.dispose(), [dot]);
  const night = phase === "night" || phase === "sunset";
  const W = ZONES[1].l;
  const L = ZONES[2].l;
  const A = { x: ARCH_EXT.x - 3, z: ARCH_EXT.z - 5 };
  // 팻말: 조형물 바로 앞쪽, 길에서 보이도록 옆으로 비껴 세워 이동점을 향하게 함
  const signAt = [0, 3, 1, 2].map((zone, k) => ({ zone, viewIdx: k + 1, at: SIGN_SPOTS[k] }));
  return (
    <group>
      <HillBalloon still={still} />
      <Gate night={night} still={still} dot={dot} />
      {/* 샛길 */}
      {TRAILS.map((t, i) => <Trail key={i} t={t} snow={snow} />)}
      {/* 구역 조형물 */}
      <group position={[A.x, height(A.x, A.z), A.z]} rotation={[0, Math.atan2(VIEWS[1].x - A.x, VIEWS[1].z - A.z), 0]} scale={0.88}><RainbowArch still={still} /></group>
      <group position={[W.x, height(W.x, W.z) - 0.3, W.z]} rotation={[0, 0, 0]} scale={1}><Windmill still={still} /></group>
      <group position={[L.x, height(L.x, L.z) - 0.3, L.z]} scale={1}><Lighthouse phase={phase} still={still} /></group>
      {/* 광장 */}
      <group position={[8, height(8, -20), -20]}><PlazaPinwheel still={still} /></group>
      {/* 구역 팻말 */}
      {signAt.map(s => {
        const v = VIEWS[s.viewIdx];
        const face = Math.atan2(v.x - s.at.x, v.z - s.at.z);
        return <ZoneSign key={s.zone} at={s.at} face={face} name={ZONES[s.zone].name} color={ZONES[s.zone].color} count={counts[s.zone] ?? 0} still={still} />;
      })}
      {/* 벤치와 가로등 */}
      {[52, 19, 7, -10, -17].map((z, i) => (
        <LampPost key={z} at={{ x: pathX(z) + (i % 2 ? 3.4 : -3.4 * (z === 52 ? 1.9 : 1)), z }} night={night} dot={dot} />
      ))}
      <Hotspots view={view} onView={onView} />
    </group>
  );
}

export interface LookPerson { id: string; lightCount?: number; garden: number }
export interface LookBoost { id: string; at: number }

let BLADE: THREE.ShapeGeometry | null = null;
/** 바람개비 날개 한 장(모든 바람개비가 함께 씀) */
function getBlade() {
  if (BLADE) return BLADE;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-0.12, 0.06, -0.28, 0.28, -0.43, 0.57);
  shape.bezierCurveTo(-0.18, 0.58, 0.08, 0.56, 0.19, 0.41);
  shape.bezierCurveTo(0.26, 0.3, 0.21, 0.12, 0, 0);
  const g = new THREE.ShapeGeometry(shape, 20);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, 0.06 + Math.sin(Math.min(1, y / 0.58) * Math.PI) * 0.12 + x * 0.22);
  }
  g.computeVertexNormals();
  BLADE = g;
  return g;
}

const PALETTES = [
  ["#f3c14f", "#fff0b8", "#edb148", "#f8dd82"],
  ["#d98565", "#ffe1bf", "#df936f", "#f6bb92"],
  ["#ac91bf", "#efe2eb", "#a394ba", "#d8c3d4"],
  ["#70afbc", "#daf2e7", "#78b9bf", "#aedbd1"],
];

/** 실종자 한 분당 바람개비 하나. 누르면 사연 카드, 응원하면 한동안 세차게 돎 */
function Pinwheels({ people, boost, still, phase, onSpots }: { people: LookPerson[]; boost: LookBoost | null; still: boolean; phase: GardenPhase; onSpots: (list: { x: number; z: number }[]) => void }) {
  const blade = getBlade();
  // 구역별 정돈: 실종자는 자기 구역 조형물 둘레에 해바라기 씨앗 배열로 고르게(서로 떨어지게), 길목과 조형물 자리는 비움
  const spots = useMemo(() => {
    const out: ({ x: number; y: number; z: number; scale: number } | undefined)[] = new Array(people.length);
    // 구역 경계: 가까운 조형물 기준(아이들의 길은 가중치를 더 줘 넓게)으로 정원을 나누고, 구역 사이엔 빈 틈을 둠
    const W = [1.08, 1, 1, 1];
    const cand: { x: number; z: number; zi: number; d: number }[] = [];
    const cr = rng(909);
    const STEP = Math.min(4.6, 34 / Math.sqrt(Math.max(1, ...ZONES.map((_, zi) => people.filter(p => p.garden === zi).length))));
    for (let gx = -88; gx <= 88; gx += STEP) {
      for (let gz = GATE_Z - 5; gz >= -98; gz -= STEP) {
        const x = gx + (cr() - 0.5) * STEP * 0.7;
        const z = gz + (cr() - 0.5) * STEP * 0.7;
        if (nearPath(x, z, 3.6)) continue;
        // 입구에서 길 안쪽으로 걸어 들어가는 길목에는 바람개비를 두지 않음
        if (z > 18 && Math.abs(x - pathX(z)) < 11) continue;
        if (Math.abs(x) > 70 || z < -84) continue;
        if (ZONES.some(zn => Math.hypot(x - zn.l.x, z - zn.l.z) < 8)) continue;
        if (VIEWS.some(v => Math.hypot(x - v.x, z - v.z) < 8)) continue;
        if (SIGN_SPOTS.some(q => Math.hypot(x - q.x, z - q.z) < 8)) continue;
        if (TREE_SPOTS.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 8)) continue;
        if (DINO_SPOTS.some(d => Math.hypot(x - d.at.x, z - d.at.z) < 7)) continue;
        // 구역 중심뿐 아니라 그 구역으로 뻗은 갈래길 근처도 그 구역으로 침 (바다 건너 길 입구에 아이들 바람개비가 오지 않게)
        const TZ = [0, 3, 1, 2];
        const ds = ZONES.map((zn, i) => {
          const ti = TZ.indexOf(i);
          const dt = ti >= 0 ? segDist(x, z, TRAILS[ti].from, trailEnd(TRAILS[ti])) + 4 : Infinity;
          return Math.min(Math.hypot(x - zn.c.x, z - zn.c.z), dt) / W[i];
        });
        const best = ds.indexOf(Math.min(...ds));
        const second = Math.min(...ds.filter((_, i) => i !== best));
        if ((second - ds[best]) / ds[best] < 0.16) continue; // 구역 사이 완충
        // 다른 구역 간판 둘레는 비워 두어, 간판 앞 바람개비가 그 구역 것으로 보이게 함
        if (SIGN_SPOTS.some((q, qi) => [0, 3, 1, 2][qi] !== best && Math.hypot(x - q.x, z - q.z) < 14)) continue;
        cand.push({ x, z, zi: best, d: ds[best] });
      }
    }
    ZONES.forEach((zone, zi) => {
      const idx: number[] = [];
      people.forEach((p, i) => { if (p.garden === zi) idx.push(i); });
      const m = idx.length;
      if (!m) return;
      const mine = cand.filter(c => c.zi === zi).sort((p, q) => q.z - p.z);
      const r = rng(404 + zi * 31);
      // 중심 쪽에 몰리지 않도록, 구역 전체에서 고르게 솎아 고름
      const stride = Math.max(1, mine.length / m);
      for (let k = 0; k < m && k * stride < mine.length; k++) {
        const c = mine[Math.min(mine.length - 1, Math.floor((k + 0.5) * stride))];
        const dist = Math.hypot(c.x - VIEWS[0].x, c.z - VIEWS[0].z);
        out[idx[k]] = { x: c.x, z: c.z, y: height(c.x, c.z), scale: THREE.MathUtils.clamp(dist / 36, 0.8, 1.45) * (0.94 + r() * 0.13) };
      }
      void zone;
    });
    return out;
  }, [people]);

  const count = people.length;
  useEffect(() => { onSpots(spots.filter((q): q is NonNullable<typeof q> => !!q).map(q => ({ x: q.x, z: q.z }))); }, [spots, onSpots]);
  const boostRef = useRef<LookBoost | null>(boost);
  useEffect(() => { boostRef.current = boost; }, [boost]);
  const peopleRef = useRef(people);
  useEffect(() => { peopleRef.current = people; }, [people]);
  const spotsRef = useRef(spots);
  useEffect(() => { spotsRef.current = spots; }, [spots]);
  // 사람별 바람개비 회전 누적값(계속 돎) — 사람 수가 바뀔 때만 새로 만듦(이후로는 useFrame에서 계속 덮어씀)
  const spinRef = useRef<Float32Array>(new Float32Array(0));
  useEffect(() => { spinRef.current = new Float32Array(count); }, [count]);

  // 바람개비 하나당 '몸통·중심 캡·날개4장·눌리는 범위' 다섯 가지를, 사람 수만큼 개별 메시로 그리면
  // (약 450명 x 6개 = 2700개 가까운 draw call) 저사양 기기에서 버벅임의 원인이 될 수 있어
  // 자리·색이 같은 부품끼리 InstancedMesh 하나로 묶어서 그림(겉보기는 동일, draw call만 크게 줄어듦)
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const capRef = useRef<THREE.InstancedMesh>(null);
  const bladeRefs = useRef<(THREE.InstancedMesh | null)[]>([null, null, null, null]);
  const bladeMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, emissive: "#ffffff", emissiveIntensity: phase === "night" ? 0.16 : 0.08 });
    // instanceColor(날개마다 다른 색)를 diffuse뿐 아니라 emissive(은은한 자체 발광)에도 그대로 적용
    mat.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\n#ifdef USE_INSTANCING_COLOR\n totalEmissiveRadiance *= vColor.rgb;\n#endif"
      );
    };
    return mat;
  }, [phase]);
  useEffect(() => () => bladeMaterial.dispose(), [bladeMaterial]);
  useEffect(() => {
    for (let i = 0; i < count; i++) {
      const p = people[i];
      const palette = PALETTES[p?.garden ?? 0] ?? PALETTES[0];
      bladeRefs.current.forEach((b, k) => { if (b) b.setColorAt(i, new THREE.Color(palette[k])); });
    }
    bladeRefs.current.forEach(b => { if (b?.instanceColor) b.instanceColor.needsUpdate = true; });
    bladeMaterial.needsUpdate = true;
  }, [people, count, bladeMaterial]);

  // 매 프레임: 자리별 위치·회전(보는 쪽 향하기)·거리별 축소·날개 회전을 합성 행렬로 계산해 instance 행렬만 갱신
  const mOuter = useMemo(() => new THREE.Matrix4(), []);
  const mLocal = useMemo(() => new THREE.Matrix4(), []);
  const mSpin = useMemo(() => new THREE.Matrix4(), []);
  const mFinal = useMemo(() => new THREE.Matrix4(), []);
  const vPos = useMemo(() => new THREE.Vector3(), []);
  const vScale = useMemo(() => new THREE.Vector3(), []);
  const qBillboard = useMemo(() => new THREE.Quaternion(), []);
  const Y_AXIS = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);
  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!still) {
      const b = boostRef.current;
      const age = b ? (Date.now() - b.at) / 1000 : 99;
      const spin = spinRef.current;
      for (let i = 0; i < count; i++) {
        const p = peopleRef.current[i];
        if (!p) continue;
        // 응원 수가 많을수록 평소에도 조금 더 빨리 돎
        let speed = 1.5 + Math.min(p.lightCount ?? 0, 40) * 0.03;
        if (b && b.id === p.id && age < 9) speed += 9 * Math.exp(-age / 3.2);
        spin[i] -= speed * dt;
      }
    }
    const trunk = trunkRef.current, cap = capRef.current;
    const blades = bladeRefs.current;
    const spin = spinRef.current;
    const curSpots = spotsRef.current;
    for (let i = 0; i < count; i++) {
      const sp = curSpots[i];
      if (!sp) {
        trunk?.setMatrixAt(i, zero); cap?.setMatrixAt(i, zero);
        blades.forEach(b => b?.setMatrixAt(i, zero));
        continue;
      }
      // 바람개비 앞면이 항상 보는 사람(카메라) 쪽을 향함
      const billboard = Math.atan2(camera.position.x - sp.x, camera.position.z - sp.z);
      qBillboard.setFromAxisAngle(Y_AXIS, billboard);
      // 가까이 다가가면 작아져서 시야를 가리지 않음
      const d = Math.hypot(camera.position.x - sp.x, camera.position.z - sp.z);
      const s = sp.scale * THREE.MathUtils.clamp((d - 1.5) / 6, 0.22, 1);
      vPos.set(sp.x, sp.y, sp.z);
      vScale.setScalar(s);
      mOuter.compose(vPos, qBillboard, vScale);
      if (trunk) { mLocal.makeTranslation(0, 0.88, 0); mFinal.multiplyMatrices(mOuter, mLocal); trunk.setMatrixAt(i, mFinal); }
      mLocal.makeTranslation(0, 1.75, 0.05);
      mSpin.makeRotationZ(spin[i]);
      mFinal.multiplyMatrices(mOuter, mLocal).multiply(mSpin);
      if (cap) { mLocal.makeTranslation(0, 0, 0.22); const capM = new THREE.Matrix4().multiplyMatrices(mFinal, mLocal); cap.setMatrixAt(i, capM); }
      blades.forEach((b, k) => {
        if (!b) return;
        mLocal.makeRotationZ((k * Math.PI) / 2);
        const bladeM = new THREE.Matrix4().multiplyMatrices(mFinal, mLocal);
        b.setMatrixAt(i, bladeM);
      });
    }
    if (trunk) trunk.instanceMatrix.needsUpdate = true;
    if (cap) cap.instanceMatrix.needsUpdate = true;
    blades.forEach(b => { if (b) b.instanceMatrix.needsUpdate = true; });
  });

  if (!count) return null;
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, count]} raycast={() => null} frustumCulled={false}>
        <cylinderGeometry args={[0.025, 0.03, 1.76, 8]} />
        <meshStandardMaterial color="#b78c60" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={capRef} args={[undefined, undefined, count]} raycast={() => null} frustumCulled={false}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color="#d6ae68" roughness={0.5} metalness={0.25} />
      </instancedMesh>
      {[0, 1, 2, 3].map(k => (
        <instancedMesh key={k} ref={el => { bladeRefs.current[k] = el; }} args={[blade, bladeMaterial, count]} raycast={() => null} frustumCulled={false} />
      ))}
    </group>
  );
}

export interface LookSceneProps {
  phase: GardenPhase;
  weather: Weather | null;
  reducedMotion: boolean;
  paused: boolean;
  /** 12월이면 트리를 보여 줌 */
  december: boolean;
  people: LookPerson[];
  boost: LookBoost | null;
  onSelect: (id: string) => void;
  /** 지금 보는 이동점(0=입구) */
  view: number;
  onView: (i: number) => void;
  /** 같은 이동점을 다시 눌러도 그 자리로 되돌리기 위한 값 (눌릴 때마다 올림) */
  resetKey?: number;
  /** 앞으로(1)/뒤로(-1) 한 걸음 (누를 때마다 n을 올림) */
  step?: { dir: 1 | -1; n: number } | null;
  /** 조이스틱 값: x(좌우)·y(앞뒤) -1~1. 값이 있으면 그만큼 자유롭게 걸음 */
  joy?: { current: { x: number; y: number } };
  /** 지금 서 있는 곳의 길 이름 번호(0=입구, 1=아이들, 2=바다 건너, 3=어른들, 4=오래 기다리는) */
  onArea?: (i: number) => void;
  /** 올릴 때마다 아치 문을 지나 길로 걸어 들어감 */
  enterKey?: number;
  /** 입장 걷기를 어디서 멈출지: 아치 정중앙("gate") 또는 길 안쪽("path") */
  enterEnd?: "gate" | "path";
  onReady?: () => void;
  /** 화면 밖에 있을 때 그리기를 멈춤 (카드 화면 위쪽 장면용) */
  idle?: boolean;
  /** 카드 화면 위 입구 장면: 드래그로 둘러보기를 막고 페이지가 위아래로 스크롤되게 함 */
  lockLook?: boolean;
}

/** 첫 몇 프레임 뒤 정지 오브젝트가 그림자를 드리우게 표시 (바람개비·꽃은 제외) */
function ShadowPass({ phase }: { phase: GardenPhase }) {
  const done = useRef(0);
  useFrame(({ scene, gl }) => {
    if (done.current > 3 || phase === "night") { done.current = 99; return; }
    done.current += 1;
    if (done.current !== 3) return;
    const walk = (o: THREE.Object3D) => {
      if (o.userData.noShadow) return;
      const m = o as THREE.Mesh;
      if (m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh) {
        const mt = m.material as THREE.Material & { isShaderMaterial?: boolean };
        m.receiveShadow = true;
        if (o.userData.ground !== true && !mt.transparent && !mt.isShaderMaterial) m.castShadow = true;
      }
      if ((o as THREE.DirectionalLight).isDirectionalLight) {
        const l = o as THREE.DirectionalLight;
        l.shadow.mapSize.set(2048, 2048);
        l.shadow.map?.dispose();
        l.shadow.map = null;
        l.shadow.camera.left = -100; l.shadow.camera.right = 100; l.shadow.camera.top = 105; l.shadow.camera.bottom = -85;
        l.shadow.camera.updateProjectionMatrix();
        l.shadow.radius = 5;
      }
      o.children.forEach(walk);
    };
    walk(scene);
    gl.shadowMap.needsUpdate = true;
  });
  return null;
}

/** 입장 경로: 문 앞에서 정렬 → 아치 정중앙 통과 → 길 안쪽 */
const ENTER_WAYPOINTS: Pt[] = [
  { x: pathX(GATE_Z + 21), z: GATE_Z + 21 },
  { x: pathX(GATE_Z), z: GATE_Z },
  { x: pathX(24), z: 24 },
];

function Content({ phase, weather, reducedMotion, paused, december, people, boost, view, onView, resetKey = 0, step = null, joy, onArea, enterKey = 0, enterEnd = "path", onReady, lockLook = false }: LookSceneProps) {
  const player = useRef({ x: 0, z: 8 });
  const [walk, setWalk] = useState<{ x: number; z: number; n: number; view: number; reset: number; keepYaw: boolean; cruise?: boolean; lift?: number } | null>(null);
  const walked = walk !== null && walk.view === view && walk.reset === resetKey;
  const snowy = weather?.kind === "snow";
  const wet = snowy || weather?.kind === "rain";
  const pinSpots = useRef<{ x: number; z: number }[]>([]);
  const onWalk = useCallback((x: number, z: number, keepYaw = false) => {
    // 카드 위 정원 입구(lockLook)는 보기만 하는 미리보기라 터치해도 걸어가면 안 됨
    if (lockLook) return;
    // 정원 안쪽만 걸을 수 있음 (입구 앞 들판부터 가장 안쪽까지)
    const nx = THREE.MathUtils.clamp(x, -72, 72);
    const nz = THREE.MathUtils.clamp(z, -86, START_Z);
    let wx = nx;
    let wz = nz;
    for (const [tx, tz] of TREE_SPOTS) {
      const d = Math.hypot(wx - tx, wz - tz);
      if (d < 8) { wx = tx + ((wx - tx) / (d || 1)) * 8; wz = tz + ((wz - tz) / (d || 1)) * 8; }
    }
    // 바람개비에 너무 붙어 서면 화면을 가리므로, 가까운 곳 중 바람개비와 3.4칸 이상 떨어진 자리를 고름
    const clear = (px: number, pz: number) => {
      let m = 3.4;
      for (const q of pinSpots.current) { const d = Math.hypot(px - q.x, pz - q.z); if (d < m) m = d; }
      return m;
    };
    if (clear(wx, wz) < 3.4) {
      let bx = wx, bz = wz, bs = -Infinity;
      for (let ox = -9; ox <= 9; ox += 1.5) {
        for (let oz = -9; oz <= 9; oz += 1.5) {
          const cx = THREE.MathUtils.clamp(wx + ox, -72, 72), cz = THREE.MathUtils.clamp(wz + oz, -86, START_Z);
          const sc = clear(cx, cz) * 3 - Math.hypot(ox, oz);
          if (sc > bs) { bs = sc; bx = cx; bz = cz; }
        }
      }
      wx = bx; wz = bz;
    }
    setWalk(w => ({ x: wx, z: wz, n: (w?.n ?? 0) + 1, view, reset: resetKey, keepYaw }));
  }, [view, resetKey]);
  // 조이스틱으로 걸을 때: 정원 안쪽 경계, 나무 몸통은 통과하지 못함(파고드는 방향만 막고, 옆으로 스치는 움직임·뒷걸음질은 그대로 둠)
  // 바람개비는 충돌 처리에서 뺌: 밀집한 구역에서 겹친 원들이 서로 되밀어내면서 이동량이 거의 0으로
  // 수렴해 제자리에 멈추는 문제가 있었고, 이제 클릭 기능도 없어 순전히 장식이라 그냥 통과해도 됨
  const solid = useCallback((x: number, z: number, fromX: number, fromZ: number) => {
    let wx = THREE.MathUtils.clamp(x, -72, 72);
    let wz = THREE.MathUtils.clamp(z, -86, START_Z);
    const bump = (cx: number, cz: number, r: number, nudge: number) => {
      const dx = wx - cx, dz = wz - cz;
      const d = Math.hypot(dx, dz);
      if (d >= r) return;
      const nxv = dx / (d || 1), nzv = dz / (d || 1);
      let mx = wx - fromX, mz = wz - fromZ;
      // 거의 정면으로 파고드는 움직임이면, 제자리에 멈춰버리지 않도록 살짝 옆으로도 흘러가게 함
      const tangentX = -nzv, tangentZ = nxv;
      if (Math.abs(mx * tangentX + mz * tangentZ) < 0.02) { mx += tangentX * nudge; mz += tangentZ * nudge; }
      const into = mx * nxv + mz * nzv;
      let sx = fromX + mx, sz = fromZ + mz;
      if (into < 0) { sx -= into * nxv; sz -= into * nzv; }
      if (Math.hypot(sx - cx, sz - cz) < r) { wx = cx + nxv * r; wz = cz + nzv * r; } else { wx = sx; wz = sz; }
    };
    for (const [tx, tz] of TREE_SPOTS) bump(tx, tz, 3, 0.12);
    return { x: wx, z: wz };
  }, []);
  const lookRef = useRef({ x: 0, z: 0, yaw: 0 });
  const areaRef = useRef(0);
  const goingView = useRef(false);
  useEffect(() => { goingView.current = true; enterStage.current = 0; }, [view, resetKey]);
  const enterStage = useRef(0);
  const enterEndRef = useRef<"gate" | "path">("path");
  const lastEnter = useRef(0);
  const onLook = useCallback((x: number, z: number, yaw: number) => {
    lookRef.current = { x, z, yaw };
    // 서 있는 곳에서 가장 가까운 길 이름 (경계에서 깜빡이지 않게 여유를 둠)
    if (onArea) {
      const LABEL = [1, 3, 4, 2];
      let next = areaRef.current;
      const vv = VIEWS[view] ?? VIEWS[0];
      const toView = Math.hypot(x - vv.x, z - vv.z);
      if (goingView.current && toView < 4) goingView.current = false;
      if (joy && Math.hypot(joy.current.x, joy.current.y) > 0.08) goingView.current = false;
      if (view > 0 && (goingView.current || toView < 4)) next = view;
      else if (view === 0 && goingView.current) next = 0;
      else if (z > 30) next = 0;
      else {
        const TZ = [0, 3, 1, 2];
        const ds = ZONES.map((zn, zi) => Math.min(Math.hypot(x - zn.l.x, z - zn.l.z), Math.hypot(x - SIGN_SPOTS[[0, 2, 3, 1][zi]].x, z - SIGN_SPOTS[[0, 2, 3, 1][zi]].z), segDist(x, z, TRAILS[TZ.indexOf(zi)].from, trailEnd(TRAILS[TZ.indexOf(zi)])) + 3));
        const best = ds.indexOf(Math.min(...ds));
        const cur = areaRef.current === 0 ? -1 : LABEL.indexOf(areaRef.current);
        if (cur < 0 || ds[best] + 6 < ds[cur]) next = LABEL[best];
      }
      if (next !== areaRef.current) { areaRef.current = next; onArea(next); }
    }
    // 입장: 문 앞 → 아치 정중앙 → 길 안쪽 순서로 이어 걷기
    if (joy && Math.hypot(joy.current.x, joy.current.y) > 0.08) enterStage.current = 0;
    if (enterStage.current > 0) {
      const wp = ENTER_WAYPOINTS[enterStage.current - 1];
      if (Math.hypot(x - wp.x, z - wp.z) < 1.2) {
        if (enterStage.current < (enterEndRef.current === "gate" ? 1 : ENTER_WAYPOINTS.length)) {
          const nx = ENTER_WAYPOINTS[enterStage.current];
          enterStage.current += 1;
          setWalk(w => ({ x: nx.x, z: nx.z, n: (w?.n ?? 0) + 1, view, reset: resetKey, keepYaw: false, cruise: true }));
        } else {
          enterStage.current = 0;
        }
      }
    }
    // 비·눈 입자가 항상 보는 사람 둘레 전체에 내리게 함
    player.current = { x, z };
  }, [onArea, view, resetKey, joy]);
  const [spotList, setSpotList] = useState<{ x: number; z: number }[]>([]);
  const onSpots = useCallback((list: { x: number; z: number }[]) => { pinSpots.current = list; setSpotList(list); }, []);
  useEffect(() => {
    if (!enterKey || enterKey === lastEnter.current) return;
    lastEnter.current = enterKey;
    const here = lookRef.current;
    const targetIndex = here.z > GATE_Z + 1 ? 1 : 2;
    enterStage.current = targetIndex + 1;
    enterEndRef.current = enterEnd;
    const nextZ = Math.max(MAIN_END, Math.min(24, here.z - 12));
    const target = here.z <= 24.5 ? { x: pathX(nextZ), z: nextZ } : ENTER_WAYPOINTS[targetIndex];
    if (here.z < GATE_Z - 7) enterStage.current = 0;
    setWalk(w => ({ ...target, n: (w?.n ?? 0) + 1, view, reset: resetKey, keepYaw: false, cruise: true }));
  }, [enterKey, enterEnd, view, resetKey]);
  const lastStep = useRef(0);
  useEffect(() => {
    if (!step || step.n === lastStep.current) return;
    lastStep.current = step.n;
    const L = lookRef.current;
    // 진행 방향(앞/뒤) 부채꼴 안에서 가장 가까운 바람개비를 찾아, 그 앞 7칸에 서서 바람개비 전체가 한눈에 보이게 함
    const fx = -Math.sin(L.yaw) * step.dir;
    const fz = -Math.cos(L.yaw) * step.dir;
    let best: { x: number; z: number } | null = null;
    let bd = Infinity;
    for (const q of pinSpots.current) {
      const dx = q.x - L.x;
      const dz = q.z - L.z;
      const d = Math.hypot(dx, dz);
      if (d < 8 || d > 40) continue;
      if ((dx * fx + dz * fz) / d < 0.8) continue;
      if (d < bd) { bd = d; best = q; }
    }
    if (best) {
      const d = Math.hypot(best.x - L.x, best.z - L.z);
      onWalk(best.x - ((best.x - L.x) / d) * 5, best.z - ((best.z - L.z) / d) * 5, true);
    } else {
      onWalk(L.x + fx * 6, L.z + fz * 6, true);
    }
  }, [step, onWalk]);
  useEffect(() => { onReady?.(); }, [onReady]);
  const still = reducedMotion || paused;
  const night = phase === "night";
  const counts = useMemo(() => {
    const c = [0, 0, 0, 0];
    for (const p of people) if (c[p.garden] !== undefined) c[p.garden] += 1;
    return c;
  }, [people]);
  return (
    <>
      <ResponsiveFov />
      <DragLook paused={paused} reducedMotion={reducedMotion} view={view} reset={resetKey} walk={walk} onLook={onLook} joy={joy} solid={solid} lockLook={lockLook} />
      <Atmosphere phase={phase} overview={false} weather={weather?.kind} exponential />
      <ShadowPass phase={phase} />
      <Field phase={phase} still={still} snow={snowy} onWalk={onWalk} />
      <Path snow={snowy} />
      <StoryProps phase={phase} snow={snowy} still={reducedMotion || paused ? true : false} avoid={spotList} />
      <Scenery phase={phase} still={still} view={walked ? -1 : view} onView={onView} counts={counts} snow={snowy} />
      <group userData={{ noShadow: true }}><Pinwheels people={people} boost={boost} still={reducedMotion} phase={phase} onSpots={onSpots} /></group>
      {!night && <WindStreaks still={still} />}
      <Clouds phase={phase} still={still} />
      <Airplane phase={phase} still={still} />
      <ExpoWeather weather={weather} player={player} paused={still} />
      {(december || snowy) && <ChristmasTree still={still} />}
    </>
  );
}

function LookScene(props: LookSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={props.idle ? "never" : "always"}
      shadows
      camera={{ position: [VIEWS[0].x, height(VIEWS[0].x, VIEWS[0].z) + EYE, VIEWS[0].z], fov: 52, near: 0.5, far: 1200 }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ touchAction: props.lockLook ? "pan-y" : "none" }}
    >
      <Content {...props} />
    </Canvas>
  );
}

export default memo(LookScene);
