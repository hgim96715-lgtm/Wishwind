"use client";
/* 언덕의 풍경: 나무, 앉을 수 있는 벤치, 가끔 하늘을 지나가는 비행기 */

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Slot } from "../path-layout";
import {
  coastX,
  GARDEN_CENTER,
  grassAmount,
  hash2,
  heightAt,
  inWater,
  lanternPoint,
  LIGHTHOUSE,
  pathAmount,
  pondDistance,
  pondsNear,
  SLOT_SPACING,
  slotAtZ,
  SPAWN,
  START_POND_VIEW,
  trailX,
} from "./world";

/* ───────────────────────── 자리 계산 ───────────────────────── */

export interface Bench {
  id: string;
  x: number;
  z: number;
  /** 앉았을 때 바라보는 방향 (카메라 yaw와 같은 기준: 0 = -z, π/2 = -x 바다 쪽) */
  yaw: number;
}

/** 앉았을 때 엉덩이가 놓이는 높이 (벤치 앉는 판 높이) */
export const SEAT_HEIGHT = 0.46;

/** 등불이 서 있는 자리 근처인지 (나무·벤치가 등불을 가리지 않게) */
function nearLantern(slots: Slot[], x: number, z: number, range: number) {
  const c = Math.round(slotAtZ(z));
  for (let i = Math.max(0, c - 3); i <= Math.min(slots.length - 1, c + 3); i++) {
    const s = slots[i];
    if (s.kind !== "lantern") continue;
    const [lx, , lz] = lanternPoint(i, s.side);
    if (Math.hypot(lx - x, lz - z) < range) return true;
  }
  return false;
}

/** 길·물·정원·등대·광장을 피한 풀밭인지 */
function openGrass(slots: Slot[], x: number, z: number, room: number) {
  if (grassAmount(x, z) < 0.85) return false;
  if (inWater(x, z) || pondsNear(z, 8).some((p) => pondDistance(p, x, z) < 1.7)) return false;
  for (const [dx, dz] of [[0, 0], [room, 0], [-room, 0], [0, room], [0, -room]]) if (pathAmount(x + dx, z + dz) > 0.02) return false;
  if (Math.hypot(x - GARDEN_CENTER[0], z - GARDEN_CENTER[1]) < 16) return false;
  if (Math.hypot(x - LIGHTHOUSE[0], z - LIGHTHOUSE[1]) < 7) return false;
  if (Math.hypot(x - SPAWN[0], z - SPAWN[1]) < 7) return false;
  if (Math.hypot(x - START_POND_VIEW[0], z - START_POND_VIEW[1]) < 4) return false;
  return !nearLantern(slots, x, z, room + 1.2);
}

/** 바다를 바라보는 벤치: 등대 옆 절벽, 시작 연못가, 그리고 등불 길 바로 옆(바다 쪽)에 띄엄띄엄 */
export function benchSpots(slots: Slot[]): Bench[] {
  const list: Bench[] = [
    { id: "lighthouse", x: LIGHTHOUSE[0] - 3.2, z: LIGHTHOUSE[1] + 6.5, yaw: Math.PI / 2 },
    { id: "pond", x: 27.6, z: 12.5, yaw: Math.PI / 2 },
  ];
  const zEnd = -(slots.length + 2) * SLOT_SPACING;
  for (let z = -36, n = 0; z > zEnd; z -= 48, n++) {
    // 등불과 겹치면 조금씩 옮겨 봄
    for (const dz of [0, 3, -3, 6, -6, 9, -9]) {
      const bz = z + dz;
      // 길에서 몇 걸음 바다 쪽 (멀리 떨어져 있으면 찾기 어려움)
      const bx = trailX(slotAtZ(bz)) - 3.4;
      if (openGrass(slots, bx, bz, 1.4)) {
        list.push({ id: `coast-${n}`, x: bx, z: bz, yaw: Math.PI / 2 });
        break;
      }
    }
  }
  return list;
}

export interface Tree {
  x: number;
  z: number;
  scale: number;
  /** 0 = 둥근 나무, 1 = 뾰족한 나무 */
  kind: 0 | 1;
  tint: number;
}

/** 나무 자리: 오솔길 안쪽 들판과 바닷가 풀밭에 띄엄띄엄 (같은 사건 수면 늘 같은 자리) */
export function treeSpots(slots: Slot[], benches: Bench[]): Tree[] {
  const list: Tree[] = [];
  const zEnd = -(slots.length + 2) * SLOT_SPACING;
  // 시작 광장 둘레: 정원·등대를 가리지 않는 뒤쪽·오른쪽에 작은 숲
  const plaza: [number, number][] = [
    [16, 34], [-6, 38], [28, 25], [33, 8],
  ];
  const ok = (x: number, z: number) =>
    heightAt(x, z) > 0.4 &&
    openGrass(slots, x, z, 1.6) &&
    benches.every((b) => Math.hypot(b.x - x, b.z - z) > 4.5) &&
    list.every((t) => Math.hypot(t.x - x, t.z - z) > 8);
  const push = (x: number, z: number, seed: number) =>
    list.push({
      x,
      z,
      scale: 0.85 + hash2(seed, 3.3) * 0.6,
      kind: hash2(seed, 7.7) < 0.4 ? 1 : 0,
      tint: hash2(seed, 9.1),
    });
  plaza.forEach(([x, z], k) => ok(x, z) && push(x, z, k + 0.5));
  // 너무 빽빽하지 않게: 16칸마다 한두 그루, 바닷가는 가끔
  for (let z = 4, k = 0; z > zEnd; z -= 16, k++) {
    const slot = slotAtZ(z);
    // 안쪽 들판 (길에서 9~45)
    for (let j = 0; j < 2; j++) {
      if (j === 1 && hash2(k * 0.29, 3.7) < 0.5) continue;
      const r = hash2(k * 1.37 + j * 0.41, 2.2);
      const x = trailX(slot) + 9 + r * 36;
      const pz = z + (hash2(k * 0.73, j + 4.4) - 0.5) * 8;
      if (ok(x, pz)) push(x, pz, k * 3 + j);
    }
    // 바닷가 풀밭 (넷에 하나꼴)
    if (hash2(k * 0.51, 6.6) < 0.25) {
      const x = coastX(z) + 7 + hash2(k, 1.9) * 3;
      if (x < trailX(slot) - 3 && ok(x, z)) push(x, z, k * 3 + 2);
    }
  }
  return list;
}

/** 나무 기둥에 부딪히는지 (걷기 막기용). z 구간별로 묶어 빨리 찾음 */
export function makeTreeBlocker(trees: Tree[]) {
  const buckets = new Map<number, Tree[]>();
  for (const t of trees) {
    const k = Math.floor(t.z / 8);
    buckets.set(k, [...(buckets.get(k) ?? []), t]);
  }
  return (x: number, z: number) => {
    const k = Math.floor(z / 8);
    for (const b of [k - 1, k, k + 1])
      for (const t of buckets.get(b) ?? []) if (Math.hypot(t.x - x, t.z - z) < 0.55 * t.scale + 0.3) return true;
    return false;
  };
}

/* ───────────────────────── 나무 ───────────────────────── */

const ROUND_GREENS = ["#6fae5c", "#7dbb63", "#5f9f58", "#8cc26a"];
const PINE_GREENS = ["#4f8f60", "#5a9a68", "#467f57"];

/** 낮은 다각형 나무 (기둥 + 잎). 수백 그루도 한 번에 그리도록 InstancedMesh 사용 */
export function Trees({ trees }: { trees: Tree[] }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const tops = useRef<THREE.InstancedMesh>(null);
  const pines = useRef<THREE.InstancedMesh>(null);
  const round = useMemo(() => trees.filter((t) => t.kind === 0), [trees]);
  const pointy = useMemo(() => trees.filter((t) => t.kind === 1), [trees]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const c = new THREE.Color();
    trees.forEach((t, i) => {
      const y = heightAt(t.x, t.z);
      s.set(t.scale, t.scale, t.scale);
      p.set(t.x, y + 0.9 * t.scale, t.z);
      trunks.current?.setMatrixAt(i, m.compose(p, q, s));
    });
    round.forEach((t, i) => {
      const y = heightAt(t.x, t.z);
      q.setFromEuler(new THREE.Euler(0, t.tint * 6, 0));
      s.set(t.scale * 1.15, t.scale, t.scale * 1.15);
      p.set(t.x, y + 2.3 * t.scale, t.z);
      crowns.current?.setMatrixAt(i, m.compose(p, q, s));
      s.set(t.scale * 0.75, t.scale * 0.7, t.scale * 0.75);
      p.set(t.x + 0.25 * t.scale, y + 3.05 * t.scale, t.z - 0.15 * t.scale);
      tops.current?.setMatrixAt(i, m.compose(p, q, s));
      c.set(ROUND_GREENS[Math.floor(t.tint * ROUND_GREENS.length)]);
      crowns.current?.setColorAt(i, c);
      tops.current?.setColorAt(i, c.offsetHSL(0, 0, 0.04));
    });
    q.identity();
    pointy.forEach((t, i) => {
      const y = heightAt(t.x, t.z);
      s.set(t.scale, t.scale * 1.1, t.scale);
      p.set(t.x, y + 2.5 * t.scale, t.z);
      pines.current?.setMatrixAt(i, m.compose(p, q, s));
      pines.current?.setColorAt(i, c.set(PINE_GREENS[Math.floor(t.tint * PINE_GREENS.length)]));
    });
    for (const r of [trunks, crowns, tops, pines]) {
      if (!r.current) continue;
      r.current.instanceMatrix.needsUpdate = true;
      if (r.current.instanceColor) r.current.instanceColor.needsUpdate = true;
      r.current.computeBoundingSphere();
    }
  }, [trees, round, pointy]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.16, 0.24, 1.8, 6]} />
        <meshStandardMaterial color="#8a6748" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, round.length]} frustumCulled={false}>
        <icosahedronGeometry args={[1.25, 0]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={tops} args={[undefined, undefined, round.length]} frustumCulled={false}>
        <icosahedronGeometry args={[1.0, 0]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={pines} args={[undefined, undefined, pointy.length]} frustumCulled={false}>
        <coneGeometry args={[1.1, 3.4, 7]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
    </group>
  );
}

/* ───────────────────────── 벤치 ───────────────────────── */

/** 나무 벤치. 앉는 쪽이 bench.yaw 방향(바다)을 봄 */
export function Benches({ benches }: { benches: Bench[] }) {
  return (
    <group>
      {benches.map((b) => (
        <group key={b.id} position={[b.x, heightAt(b.x, b.z), b.z]} rotation={[0, b.yaw, 0]}>
          {/* 이 안에서는 앞(-z)이 앉은 사람이 보는 쪽 */}
          <mesh position={[0, SEAT_HEIGHT - 0.04, 0]}>
            <boxGeometry args={[1.9, 0.08, 0.5]} />
            <meshStandardMaterial color="#b98a5e" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.72, 0.24]} rotation={[-0.18, 0, 0]}>
            <boxGeometry args={[1.9, 0.28, 0.06]} />
            <meshStandardMaterial color="#b98a5e" roughness={0.9} />
          </mesh>
          {[-0.82, 0.82].map((x) => (
            <group key={x}>
              <mesh position={[x, SEAT_HEIGHT / 2 - 0.04, -0.15]}>
                <boxGeometry args={[0.08, SEAT_HEIGHT, 0.08]} />
                <meshStandardMaterial color="#5f5a55" roughness={0.8} />
              </mesh>
              <mesh position={[x, 0.43, 0.2]}>
                <boxGeometry args={[0.08, 0.86, 0.08]} />
                <meshStandardMaterial color="#5f5a55" roughness={0.8} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ───────────────────────── 비행기 ───────────────────────── */

const FLIGHT_SECONDS = 40;
/** 카메라 앞 이 거리쯤에서 옆으로 가로지름 (머리 위로 지나가면 화면에 안 보임) */
const FLIGHT_AHEAD = 130;
const FLIGHT_HALF = 165;

/**
 * 가끔(1~3분에 한 번) 먼 하늘을 가로질러 가는 작은 비행기. 밤에는 날개 끝 등이 깜빡임.
 * 지나갈 때마다 그때 보고 있는 쪽 하늘에서 왼쪽→오른쪽 또는 반대로 지나감
 */
export function Airplane({ night }: { night: boolean }) {
  const plane = useRef<THREE.Group>(null);
  const strobe = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.Mesh>(null);
  const flight = useRef<{ start: number; from: THREE.Vector3; dir: THREE.Vector3 } | null>(null);
  // 첫 비행기는 들어오고 조금 뒤(8~20초)에 지나감
  const next = useRef<number | null>(null);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const g = plane.current;
    if (!g) return;
    if (next.current === null) next.current = t + 8 + Math.random() * 12;
    if (!flight.current && t >= next.current) {
      const ahead = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
      const dir = new THREE.Vector3(-ahead.z, 0, ahead.x).multiplyScalar(Math.random() < 0.5 ? 1 : -1);
      // 살짝 비스듬히 지나가도록 방향을 조금 틀고, 지평선 위 8~14도 높이
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.5);
      const dist = FLIGHT_AHEAD * (0.85 + Math.random() * 0.3);
      const center = camera.position.clone().addScaledVector(ahead, dist);
      center.y = camera.position.y + dist * Math.tan(((8 + Math.random() * 6) * Math.PI) / 180);
      const from = center.addScaledVector(dir, -FLIGHT_HALF);
      flight.current = { start: t, from, dir };
    }
    const f = flight.current;
    if (!f) {
      g.visible = false;
      return;
    }
    const k = (t - f.start) / FLIGHT_SECONDS;
    if (k >= 1) {
      flight.current = null;
      next.current = t + 60 + Math.random() * 120;
      g.visible = false;
      return;
    }
    g.visible = true;
    g.position.copy(f.from).addScaledVector(f.dir, k * FLIGHT_HALF * 2);
    g.rotation.set(0, Math.atan2(f.dir.x, f.dir.z), 0);
    if (strobe.current) strobe.current.visible = night && t % 1.4 < 0.12;
    if (trail.current) trail.current.visible = !night;
  });

  const body = { color: "#f4f6fa", roughness: 0.6, fog: false } as const;
  return (
    <group ref={plane} visible={false} scale={3}>
      {/* 이 안에서는 앞이 +z */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.32, 3.2, 4, 8]} />
        <meshStandardMaterial {...body} />
      </mesh>
      <mesh position={[0, -0.05, 0.2]}>
        <boxGeometry args={[4.6, 0.08, 0.8]} />
        <meshStandardMaterial {...body} />
      </mesh>
      <mesh position={[0, 0.05, -1.7]}>
        <boxGeometry args={[1.6, 0.06, 0.45]} />
        <meshStandardMaterial {...body} />
      </mesh>
      <mesh position={[0, 0.5, -1.75]}>
        <boxGeometry args={[0.06, 0.8, 0.5]} />
        <meshStandardMaterial color="#e2786a" roughness={0.6} fog={false} />
      </mesh>
      {/* 날개 끝 등: 왼쪽 빨강, 오른쪽 초록 (밤에만 밝음) */}
      <mesh position={[2.3, 0, 0.2]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshBasicMaterial color={night ? "#ff4d4d" : "#d9a0a0"} fog={false} toneMapped={false} />
      </mesh>
      <mesh position={[-2.3, 0, 0.2]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshBasicMaterial color={night ? "#4dff88" : "#a0d9b0"} fog={false} toneMapped={false} />
      </mesh>
      <mesh ref={strobe} position={[0, -0.4, 0]} visible={false}>
        <sphereGeometry args={[0.28, 8, 6]} />
        <meshBasicMaterial color="#ffffff" fog={false} toneMapped={false} />
      </mesh>
      {/* 낮에만 보이는 옅은 비행운 */}
      <mesh ref={trail} position={[0, 0, -16]}>
        <boxGeometry args={[0.18, 0.18, 28]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} depthWrite={false} fog={false} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── 등대 불빛 ───────────────────────── */

/** 등대 불빛 줄기: 등 쪽은 밝고 끝으로 갈수록 사라짐 (끝이 잘린 회색 원판처럼 보이던 문제) */
export const beamMaterial = (opacity: number) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: { color: { value: new THREE.Color("#ffe9b0") }, opacity: { value: opacity } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; varying vec2 vUv;
      void main(){ float a = pow(vUv.y, 2.2) * opacity; gl_FragColor = vec4(color * a, a); }`,
  });
