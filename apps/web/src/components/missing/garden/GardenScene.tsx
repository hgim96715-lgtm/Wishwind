"use client";
/*
 * three.js 객체(지오메트리·카메라·위치 벡터)는 매 프레임 직접 바꾸는 게 R3F의 정상 방식
 * (React state로 바꾸면 초당 60번 리렌더). React 컴파일러의 불변성 규칙만 이 파일에서 끔
 */
/* eslint-disable react-hooks/immutability */

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Slot } from "../path-layout";
import { currentHour, paletteAt, type SkyPalette } from "../time-of-day";
import { Avatar } from "./Avatar";
import { createLabelStore, LabelOverlay, LabelProjector, type Label, type LabelStore } from "./labels";
import {
  clampToLand,
  GARDEN_CENTER,
  grassAmount,
  heightAt,
  lanternPoint,
  LIGHTHOUSE,
  nearestLanternAt,
  pinwheelSpot,
  SEA_LEVEL,
  slotAtZ,
  SPAWN,
  trailPoint,
  trailX,
} from "./world";

/** 화면 연출 기준 (API의 milestones와 같은 값) */
const SUNLIGHT_AT = 10;
const HOME_PATH_AT = 50;
const MAX_PINWHEELS = 300;
const BUBBLE_MAX = 6;
const PINWHEEL_COLORS = ["#ffd166", "#7cc6f2", "#9ad97a", "#ff9f8a", "#c9a7f2", "#ffb86b"];

export interface Wish {
  id: string;
  body: string;
  pending?: boolean;
}

export interface PlayerStatus {
  region: string | null;
  nearId: string | null;
  inGarden: boolean;
}

/** DOM(조이스틱·버튼)에서 3D 세계로 넘기는 입력. ref라서 매 프레임 읽어도 리렌더 없음 */
export interface WorldControls {
  /** 조이스틱 입력 (-1~1). y가 앞 */
  stick: { x: number; y: number };
  teleport?: (x: number, z: number) => void;
}

interface SceneProps {
  slots: Slot[];
  wishes: Wish[];
  wishCount: number;
  freshId: string | null;
  paused: boolean;
  avatar: { url: string | null; nickname: string };
  controls: React.RefObject<WorldControls>;
  onSelect: (id: string) => void;
  onStatus: (s: PlayerStatus) => void;
}

function usePalette(): SkyPalette {
  const [palette, setPalette] = useState(() => paletteAt(currentHour()));
  useEffect(() => {
    const id = setInterval(() => setPalette(paletteAt(currentHour())), 60_000);
    return () => clearInterval(id);
  }, []);
  return palette;
}

export default function GardenScene(props: SceneProps & { onPalette?: (p: SkyPalette) => void }) {
  const palette = usePalette();
  // 3D 위 글자 저장소: 장면이 살아 있는 동안 하나만 씀
  const [labels] = useState(createLabelStore);
  const { onPalette } = props;
  useEffect(() => onPalette?.(palette), [palette, onPalette]);
  return (
    <div className="relative h-full w-full">
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 55, near: 0.1, far: 260, position: [SPAWN[0], 6, SPAWN[1] + 8] }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      aria-hidden
    >
      <color attach="background" args={[palette.horizon]} />
      <fog attach="fog" args={[palette.horizon, 45, 160]} />
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]} />
      <directionalLight position={[-30, 40, 10]} intensity={palette.sunIntensity} color={palette.sun} />
      <SkyDome top={palette.top} horizon={palette.horizon} />
      <LabelProjector store={labels} />
      <World {...props} palette={palette} labels={labels} />
    </Canvas>
      <LabelOverlay store={labels} />
    </div>
  );
}

function World({ slots, wishes, wishCount, freshId, paused, avatar, controls, onSelect, onStatus, palette, labels }: SceneProps & { palette: SkyPalette; labels: LabelStore }) {
  const player = useRef(new THREE.Vector3(SPAWN[0], heightAt(SPAWN[0], SPAWN[1]), SPAWN[1]));
  // 표지판·말풍선은 플레이어 근처만 그림 → 수천 개 DOM을 만들지 않음 (5칸 단위로만 갱신)
  const [nearSlot, setNearSlot] = useState(0);
  const home = wishCount >= HOME_PATH_AT;
  const night = palette.dark;

  return (
    <>
      <Terrain palette={palette} player={player} />
      <Sea palette={palette} player={player} />
      <Lanterns slots={slots} lamp={palette.lamp} onSelect={onSelect} />
      <RegionSigns slots={slots} nearSlot={nearSlot} labels={labels} />
      <Lighthouse night={night} home={home} />
      <PinwheelGarden wishes={wishes} wishCount={wishCount} freshId={freshId} player={player} labels={labels} />
      <Butterflies />
      <Meadow />
      {wishCount >= SUNLIGHT_AT && <GardenSunlight golden={home} />}
      <Player
        slots={slots}
        paused={paused}
        avatar={avatar}
        controls={controls}
        player={player}
        labels={labels}
        onSelect={onSelect}
        onStatus={onStatus}
        onSlot={setNearSlot}
      />
    </>
  );
}

/* ───────────────────────── 하늘 ───────────────────────── */

function SkyDome({ top, horizon }: { top: string; horizon: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vDir;
          void main(){ float h = clamp(vDir.y * 1.6 + 0.1, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.8)), 1.0); }`,
      }),
    [],
  );
  useEffect(() => {
    material.uniforms.top.value.set(top);
    material.uniforms.horizon.value.set(horizon);
  }, [material, top, horizon]);
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <mesh ref={ref} material={material} renderOrder={-1}>
      <sphereGeometry args={[240, 32, 16]} />
    </mesh>
  );
}

/* ───────────────────────── 지형 ───────────────────────── */

/**
 * 플레이어를 따라다니는 지형 한 장(180×180). 멀리 걸어가면 중심을 옮겨 높이·색을 다시 계산
 * → 수 km 길이의 길이라도 정점 1.4만 개로 끝남
 */
function Terrain({ palette, player }: { palette: SkyPalette; player: React.RefObject<THREE.Vector3> }) {
  const SIZE = 180;
  const SEG = 120;
  const { geometry, base } = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
    return { geometry: g, base: Float32Array.from(pos.array as Float32Array) };
  }, []);
  const center = useRef<{ x: number; z: number } | null>(null);
  const colors = useMemo(() => ({ grass: new THREE.Color(), sand: new THREE.Color(), dirt: new THREE.Color(), c: new THREE.Color() }), []);

  const rebuild = (cx: number, cz: number) => {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    colors.grass.set(palette.grass);
    colors.sand.set(palette.sand);
    colors.dirt.set(palette.sand).lerp(new THREE.Color("#a98b66"), 0.35);
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3] + cx;
      const z = base[i * 3 + 2] + cz;
      pos.setXYZ(i, x, heightAt(x, z), z);
      const g = grassAmount(x, z);
      colors.c.copy(colors.sand).lerp(colors.grass, g);
      // 오솔길: 길 중심에서 1.3 안쪽은 흙빛
      const onTrail = Math.max(0, 1 - Math.abs(x - trailX(slotAtZ(z))) / 1.6);
      if (z < 2) colors.c.lerp(colors.dirt, onTrail * g);
      col.setXYZ(i, colors.c.r, colors.c.g, colors.c.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    center.current = { x: cx, z: cz };
  };

  // 시간대가 바뀌면 색만 다시 계산
  useLayoutEffect(() => {
    const p = player.current;
    rebuild(Math.round(p.x / 10) * 10, Math.round(p.z / 10) * 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette.grass, palette.sand]);

  useFrame(() => {
    const p = player.current;
    const c = center.current;
    if (c && Math.hypot(p.x - c.x, p.z - c.z) > 30) rebuild(Math.round(p.x / 10) * 10, Math.round(p.z / 10) * 10);
  });

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

/** 바다: 플레이어를 따라다니는 큰 평면. 잔물결은 셰이더 없이 높이만 살짝 출렁임 */
function Sea({ palette, player }: { palette: SkyPalette; player: React.RefObject<THREE.Vector3> }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const p = player.current;
    m.position.set(Math.round(p.x / 20) * 20 - 120, SEA_LEVEL + Math.sin(clock.elapsedTime * 0.8) * 0.05, Math.round(p.z / 20) * 20);
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color={palette.sea} roughness={0.25} metalness={0.1} transparent opacity={0.94} />
    </mesh>
  );
}

/* ───────────────────────── 등불 (실종자) ───────────────────────── */

const haloTexture = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,220,160,0.8)");
  grad.addColorStop(0.3, "rgba(255,206,140,0.35)");
  grad.addColorStop(1, "rgba(255,206,140,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

/**
 * 길가 정원 등 = 실종자 한 명. 수천 개라도 기둥·지붕·등 3개의 InstancedMesh(draw call 3번)로 그림
 * 클릭하면 instanceId로 어떤 분의 등불인지 찾음
 */
function Lanterns({ slots, lamp, onSelect }: { slots: Slot[]; lamp: number; onSelect: (id: string) => void }) {
  const items = useMemo(
    () =>
      slots.flatMap((s, i) => (s.kind === "lantern" ? [{ id: s.person.id, pos: lanternPoint(i, s.side) }] : [])),
    [slots],
  );
  const posts = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const lamps = useRef<THREE.InstancedMesh>(null);
  const halos = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(items.flatMap(({ pos: [x, y, z] }) => [x, y + 1.6, z])), 3));
    return g;
  }, [items]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    items.forEach(({ pos: [x, y, z] }, i) => {
      posts.current?.setMatrixAt(i, m.makeTranslation(x, y + 0.8, z));
      roofs.current?.setMatrixAt(i, m.makeTranslation(x, y + 1.92, z));
      lamps.current?.setMatrixAt(i, m.makeTranslation(x, y + 1.6, z));
    });
    for (const r of [posts, roofs, lamps]) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  }, [items]);

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const item = e.instanceId === undefined ? undefined : items[e.instanceId];
    if (item) onSelect(item.id);
  };
  const hover = (on: boolean) => () => {
    document.body.style.cursor = on ? "pointer" : "";
  };
  const n = items.length;

  return (
    <group>
      <instancedMesh ref={posts} args={[undefined, undefined, n]} frustumCulled={false} onClick={click} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        <cylinderGeometry args={[0.05, 0.07, 1.6, 8]} />
        <meshStandardMaterial color="#a8845c" />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[undefined, undefined, n]} frustumCulled={false}>
        <coneGeometry args={[0.32, 0.22, 4]} />
        <meshStandardMaterial color="#a8845c" />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[undefined, undefined, n]} frustumCulled={false} onClick={click} onPointerOver={hover(true)} onPointerOut={hover(false)}>
        <boxGeometry args={[0.32, 0.38, 0.32]} />
        <meshStandardMaterial color="#ffc76b" emissive="#ffc76b" emissiveIntensity={lamp} toneMapped={false} />
      </instancedMesh>
      {haloTexture && (
        <points geometry={halos} frustumCulled={false}>
          <pointsMaterial map={haloTexture} size={1.8} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </points>
      )}
    </group>
  );
}

/** 근처(앞뒤 40칸) 지역 표지판만 글자 층에 올림 */
function RegionSigns({ slots, nearSlot, labels }: { slots: Slot[]; nearSlot: number; labels: LabelStore }) {
  useEffect(() => {
    const list: Label[] = slots.flatMap((s, i) => {
      if (s.kind !== "sign" || Math.abs(i - nearSlot) >= 40) return [];
      const [x, y, z] = trailPoint(i);
      return [{ id: `sign:${s.region}`, text: `${s.label} · ${s.count}명`, variant: "sign" as const, pos: [x, y + 3, z] as [number, number, number] }];
    });
    labels.set("signs", list);
  }, [slots, nearSlot, labels]);
  useEffect(() => () => labels.set("signs", []), [labels]);
  return null;
}

/* ───────────────────────── 등대 ───────────────────────── */

/** 길 잃은 사람을 집으로 안내하는 빛. 밤에는 빛줄기가 바다를 천천히 비추고, 바람개비 50개면 낮에도 환하게 켜짐 */
function Lighthouse({ night, home }: { night: boolean; home: boolean }) {
  const [lx, lz] = LIGHTHOUSE;
  const y = heightAt(lx, lz);
  const beam = useRef<THREE.Group>(null);
  const lit = night || home;
  useFrame((_, dt) => {
    if (beam.current) beam.current.rotation.y += dt * 0.5;
  });
  return (
    <group position={[lx, y, lz]}>
      <mesh position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.75, 1.05, 7, 20]} />
        <meshStandardMaterial color="#fbf6ee" roughness={0.9} />
      </mesh>
      {[1.6, 4.2].map((h) => (
        <mesh key={h} position={[0, h, 0]}>
          <cylinderGeometry args={[0.98 - h * 0.04, 1.0 - h * 0.04, 0.9, 20]} />
          <meshStandardMaterial color="#e2786a" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 7.1, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.15, 20]} />
        <meshStandardMaterial color="#5b6b7a" />
      </mesh>
      <mesh position={[0, 7.65, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.9, 16]} />
        <meshStandardMaterial color="#fff1c4" emissive="#ffd98a" emissiveIntensity={lit ? 2.4 : 0.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, 8.4, 0]}>
        <coneGeometry args={[0.75, 0.7, 16]} />
        <meshStandardMaterial color="#e2786a" roughness={0.9} />
      </mesh>
      {lit && (
        <>
          <pointLight position={[0, 7.7, 0]} color="#ffd98a" intensity={home ? 40 : 25} distance={40} />
          <group ref={beam} position={[0, 7.65, 0]}>
            {[0, Math.PI].map((r) => (
              <mesh key={r} rotation={[0, r, Math.PI / 2]} position={[Math.cos(r) * 16, 0, -Math.sin(r) * 16]}>
                <coneGeometry args={[3, 32, 24, 1, true]} />
                <meshBasicMaterial color="#ffe9b0" transparent opacity={home ? 0.16 : 0.1} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} />
              </mesh>
            ))}
          </group>
        </>
      )}
    </group>
  );
}

/* ───────────────────────── 바람개비 정원 ───────────────────────── */

/** 바람개비 날개 4장: 가운데에서 접힌 삼각형 */
const bladeGeometry = (() => {
  const v: number[] = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    const rot = (x: number, y: number): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    const p1 = rot(0, 0);
    const p2 = rot(0, 0.46);
    const p3 = rot(0.34, 0.34);
    v.push(p1[0], p1[1], 0, p2[0], p2[1], 0, p3[0], p3[1], 0.1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(v), 3));
  g.computeVertexNormals();
  return g;
})();

/**
 * 메시지 하나 = 바람개비 하나. "우리의 바람(wish)이 모여 바람개비를 돌린다"
 * 모인 수가 많을수록 다 같이 더 힘차게 돎. 막대·날개 각각 InstancedMesh 1개
 */
function PinwheelGarden({
  wishes,
  wishCount,
  freshId,
  player,
  labels,
}: {
  wishes: Wish[];
  wishCount: number;
  freshId: string | null;
  player: React.RefObject<THREE.Vector3>;
  labels: LabelStore;
}) {
  const pendingCount = wishes.filter((w) => w.pending).length;
  const n = Math.min(MAX_PINWHEELS, Math.max(wishCount + pendingCount, wishes.length));
  const sticks = useRef<THREE.InstancedMesh>(null);
  const rotors = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => Array.from({ length: MAX_PINWHEELS }, (_, k) => pinwheelSpot(k)), []);
  // 바깥쪽(큰 k)일수록 최근 메시지 → 새로 꽂은 바람개비가 정원 가장자리에 생김
  const messageAt = useMemo(() => {
    const map = new Map<number, Wish>();
    wishes.slice(0, n).forEach((w, i) => map.set(n - 1 - i, w));
    return map;
  }, [wishes, n]);
  const freshIndex = useMemo(() => {
    for (const [k, w] of messageAt) if (w.id === freshId) return k;
    return -1;
  }, [messageAt, freshId]);
  const bornAt = useRef<{ k: number; t: number } | null>(null);
  const [nearby, setNearby] = useState<number[]>([]);
  const lastNear = useRef("");

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let k = 0; k < n; k++) {
      const [x, y, z] = spots[k];
      sticks.current?.setMatrixAt(k, m.makeTranslation(x, y + 0.55, z));
      rotors.current?.setColorAt(k, c.set(PINWHEEL_COLORS[k % PINWHEEL_COLORS.length]));
    }
    if (sticks.current) {
      sticks.current.count = n;
      sticks.current.instanceMatrix.needsUpdate = true;
    }
    if (rotors.current) {
      rotors.current.count = n;
      if (rotors.current.instanceColor) rotors.current.instanceColor.needsUpdate = true;
    }
  }, [n, spots]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  // 날개 면이 시작 광장(+z) 쪽을 보게 함 → 도착하자마자 바람개비 정면이 보임
  const face = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.25, 0)), []);
  const spin = useMemo(() => new THREE.Quaternion(), []);
  const axis = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  const angle = useRef(0);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (freshIndex >= 0 && bornAt.current?.k !== freshIndex) bornAt.current = { k: freshIndex, t };
    // 바다 쪽에서 부는 바람: 기본 속도 + 모인 수만큼 더 힘차게 + 살랑이는 돌풍
    const speed = (2 + Math.min(5, wishCount / 12)) * (1 + 0.35 * Math.sin(t * 0.6) + 0.15 * Math.sin(t * 1.7));
    angle.current += dt * speed;
    const r = rotors.current;
    if (r) {
      for (let k = 0; k < n; k++) {
        const [x, y, z] = spots[k];
        let scale = 1;
        if (bornAt.current?.k === k) {
          const age = t - bornAt.current.t;
          scale = age < 0.8 ? Math.sin((age / 0.8) * Math.PI * 0.5) * 1.3 : 1 + 0.3 * Math.max(0, 1 - (age - 0.8));
        }
        spin.setFromAxisAngle(axis, angle.current + k * 0.7);
        q.copy(face).multiply(spin);
        m.compose(p.set(x, y + 1.1, z), q, s.setScalar(scale));
        r.setMatrixAt(k, m);
      }
      r.instanceMatrix.needsUpdate = true;
    }
    // 말풍선: 가까운 바람개비 메시지 최대 5개
    const pl = player.current;
    const near: number[] = [];
    for (const k of messageAt.keys()) {
      const [x, , z] = spots[k];
      if (Math.hypot(x - pl.x, z - pl.z) < 4.5) near.push(k);
    }
    near.sort((a, b) => b - a);
    const key = near.slice(0, 5).join(",");
    if (key !== lastNear.current) {
      lastNear.current = key;
      setNearby(near.slice(0, 5));
    }
  });

  // 말풍선: 가까운 메시지 + 방금 꽂은 메시지
  useEffect(() => {
    const shown = (freshIndex >= 0 && !nearby.includes(freshIndex) ? [freshIndex, ...nearby] : nearby).slice(0, BUBBLE_MAX);
    const list: Label[] = shown.flatMap((k) => {
      const w = messageAt.get(k);
      if (!w) return [];
      const [x, y, z] = spots[k];
      const variant = k === freshIndex ? "bubble-fresh" : w.pending ? "bubble-pending" : "bubble";
      return [{ id: `wish:${w.id}`, text: w.body, variant, pos: [x, y + 1.75, z] as [number, number, number] }];
    });
    labels.set("bubbles", list);
  }, [nearby, freshIndex, messageAt, spots, labels]);
  useEffect(() => () => labels.set("bubbles", []), [labels]);

  return (
    <group>
      <instancedMesh ref={sticks} args={[undefined, undefined, MAX_PINWHEELS]} frustumCulled={false}>
        <cylinderGeometry args={[0.025, 0.025, 1.1, 6]} />
        <meshStandardMaterial color="#c9a57a" />
      </instancedMesh>
      <instancedMesh ref={rotors} args={[bladeGeometry, undefined, MAX_PINWHEELS]} frustumCulled={false}>
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.7} />
      </instancedMesh>
    </group>
  );
}

/** 바람개비 10개 이상: 정원 위로 은은한 햇살 */
function GardenSunlight({ golden }: { golden: boolean }) {
  const [gx, gz] = GARDEN_CENTER;
  return (
    <mesh position={[gx, heightAt(gx, gz) + 6, gz]}>
      <cylinderGeometry args={[2, 9, 12, 32, 1, true]} />
      <meshBasicMaterial color={golden ? "#ffe0a0" : "#fff3d6"} transparent opacity={golden ? 0.14 : 0.08} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

/** 시작 광장 주변 들꽃: 빈 풀밭에 생기를 줌. 작은 점 꽃 InstancedMesh 1개 */
function Meadow() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const COUNT = 700;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const colors = ["#ffe08a", "#f7b6c8", "#c9b5f0", "#ffffff", "#ffc98a"];
    const rand = (n: number) => {
      const x = Math.sin(n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < COUNT; i++) {
      const x = GARDEN_CENTER[0] + (rand(i) - 0.5) * 70;
      const z = GARDEN_CENTER[1] + (rand(i + 999) - 0.5) * 60;
      const g = grassAmount(x, z);
      const y = heightAt(x, z);
      const s = g > 0.8 ? 0.06 + rand(i + 7) * 0.05 : 0;
      mesh.setMatrixAt(i, m.makeScale(s, s * 0.7, s).setPosition(x, y + 0.08, z));
      mesh.setColorAt(i, c.set(colors[i % colors.length]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}

/* ───────────────────────── 나비 ───────────────────────── */

const wingTexture = (color: string) => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(26, 22, 20, 16, -0.5, 0, Math.PI * 2);
  g.ellipse(24, 46, 14, 11, 0.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.beginPath();
  g.arc(22, 20, 5, 0, Math.PI * 2);
  g.fill();
  return new THREE.CanvasTexture(c);
};

/** 정원 생기를 더하는 나비 몇 마리. 바람개비 주변만 맴돌고 하늘로 떠나가지 않음 */
function Butterflies() {
  const list = useMemo(
    () =>
      ["#ffd166", "#7cc6f2", "#ff9f8a", "#c9a7f2", "#ffd166", "#9ad97a"].map((color, i) => ({
        tex: wingTexture(color),
        phase: i * 1.7,
        r: 2.5 + (i % 3) * 1.6,
        w: 0.35 + (i % 2) * 0.15,
      })),
    [],
  );
  return (
    <>
      {list.map((b, i) => (
        <Butterfly key={i} {...b} />
      ))}
    </>
  );
}

function Butterfly({ tex, phase, r, w }: { tex: THREE.Texture | null; phase: number; r: number; w: number }) {
  const g = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const [gx, gz] = GARDEN_CENTER;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * w + phase;
    const x = gx + Math.cos(t) * r * (1 + 0.25 * Math.sin(t * 2.3));
    const z = gz + Math.sin(t) * r * (1 + 0.25 * Math.cos(t * 1.7));
    const y = heightAt(x, z) + 1.1 + Math.sin(t * 3.1) * 0.35;
    if (g.current) {
      g.current.position.set(x, y, z);
      g.current.rotation.y = -t + Math.PI;
    }
    const flap = Math.sin(clock.elapsedTime * 16 + phase) * 0.9;
    if (left.current) left.current.rotation.z = flap;
    if (right.current) right.current.rotation.z = -flap;
  });
  if (!tex) return null;
  return (
    <group ref={g} scale={0.35}>
      <group ref={left}>
        <mesh position={[-0.5, 0, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      <group ref={right}>
        <mesh position={[0.5, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[-1, 1, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/* ───────────────────────── 플레이어 ───────────────────────── */

/**
 * 3인칭 걷기: 키보드(WASD·방향키)·모바일 조이스틱으로 움직이고, 화면 드래그로 둘러봄
 * 위치는 ref로만 다루고 HUD에 보낼 값(근처 등불·지역)이 바뀔 때만 React로 알림
 */
function Player({
  slots,
  paused,
  avatar,
  controls,
  player,
  labels,
  onSelect,
  onStatus,
  onSlot,
}: {
  slots: Slot[];
  paused: boolean;
  avatar: { url: string | null; nickname: string };
  controls: React.RefObject<WorldControls>;
  player: React.RefObject<THREE.Vector3>;
  labels: LabelStore;
  onSelect: (id: string) => void;
  onStatus: (s: PlayerStatus) => void;
  onSlot: (slot: number) => void;
}) {
  useEffect(() => {
    labels.set("me", avatar.nickname ? [{ id: "me", text: avatar.nickname, variant: "name", follow: player, offsetY: 1.75 }] : []);
    return () => labels.set("me", []);
  }, [labels, avatar.nickname, player]);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const getState = useThree((s) => s.get);
  const portrait = useThree((s) => s.size.width < s.size.height);
  const body = useRef<THREE.Group>(null);
  const speedRef = useRef(0);
  const yaw = useRef(0); // 카메라가 바라보는 방향 (0 = -z)
  const heading = useRef(Math.PI); // 캐릭터가 바라보는 방향 (모델 기본 = +z)
  const keys = useRef(new Set<string>());
  const pausedRef = useRef(paused);
  const lastStatus = useRef("");
  const lastSlot = useRef(0);

  useLayoutEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const cam = getState().camera;
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.fov = portrait ? 70 : 55;
      cam.updateProjectionMatrix();
    }
  }, [getState, portrait]);

  useEffect(() => {
    const c = controls.current;
    c.teleport = (x, z) => {
      player.current.set(x, heightAt(x, z), z);
    };
    const typing = (e: Event) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
    const down = (e: KeyboardEvent) => {
      if (pausedRef.current || typing(e)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Shift"].includes(k)) {
        keys.current.add(k);
        if (k.startsWith("Arrow")) e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    const blur = () => keys.current.clear();
    // 드래그로 둘러보기
    let drag: number | null = null;
    const el = gl.domElement;
    const pdown = (e: PointerEvent) => (drag = e.clientX);
    const pmove = (e: PointerEvent) => {
      if (drag === null || pausedRef.current) return;
      yaw.current += (e.clientX - drag) * 0.006;
      drag = e.clientX;
    };
    const pup = () => (drag = null);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    el.addEventListener("pointerdown", pdown);
    window.addEventListener("pointermove", pmove);
    window.addEventListener("pointerup", pup);
    return () => {
      c.teleport = undefined;
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      el.removeEventListener("pointerdown", pdown);
      window.removeEventListener("pointermove", pmove);
      window.removeEventListener("pointerup", pup);
    };
  }, [controls, gl, onSelect, player]);

  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const k = keys.current;
    const stick = controls.current.stick;
    let ix = stick.x;
    let iy = stick.y;
    if (k.has("w") || k.has("ArrowUp")) iy += 1;
    if (k.has("s") || k.has("ArrowDown")) iy -= 1;
    if (k.has("a") || k.has("ArrowLeft")) ix -= 1;
    if (k.has("d") || k.has("ArrowRight")) ix += 1;
    if (pausedRef.current) ix = iy = 0;
    const p = player.current;

    /*
     * 조종 방식: 좌우(A·D·←·→·조이스틱 좌우) = 몸과 시선을 함께 돌림, 앞뒤 = 바라보는 쪽으로 걷기
     * → 돌면 배경(카메라)도 같이 돌아서, 모바일 게임처럼 자연스럽게 방향을 바꿀 수 있음
     */
    const TURN_SPEED = 2.2; // rad/s
    if (Math.abs(ix) > 0.05) yaw.current -= ix * TURN_SPEED * dt;
    const fx = -Math.sin(yaw.current);
    const fz = -Math.cos(yaw.current);

    if (Math.abs(iy) > 0.05) {
      const speed = (k.has("Shift") ? 9 : 4.5) * Math.min(1, Math.abs(iy));
      const dir = Math.sign(iy);
      const [nx, nz] = clampToLand(p.x + fx * dir * speed * dt, p.z + fz * dir * speed * dt, slots.length);
      p.set(nx, heightAt(nx, nz), nz);
      speedRef.current = speed;
    } else {
      // 제자리에서 돌 때는 걷는 동작만 살짝
      speedRef.current = Math.abs(ix) > 0.3 ? 1 : 0;
      p.y = heightAt(p.x, p.z);
    }
    // 캐릭터는 늘 카메라가 보는 쪽(앞)을 바라봄. 뒤로 걸을 때도 몸은 앞을 향한 채 뒷걸음
    const target = Math.atan2(fx, fz);
    let diff = target - heading.current;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    heading.current += diff * (1 - Math.exp(-dt * 12));

    if (body.current) {
      body.current.position.copy(p);
      body.current.rotation.y = heading.current;
    }

    const back = portrait ? 7.5 : 6.5;
    camTarget.set(p.x + Math.sin(yaw.current) * back, p.y + (portrait ? 3.8 : 3.2), p.z + Math.cos(yaw.current) * back);
    // 카메라가 언덕 속으로 들어가지 않게
    camTarget.y = Math.max(camTarget.y, heightAt(camTarget.x, camTarget.z) + 1.2);
    camera.position.lerp(camTarget, 1 - Math.exp(-dt * 6));
    look.set(p.x - Math.sin(yaw.current) * 2, p.y + 1.3, p.z - Math.cos(yaw.current) * 2);
    camera.lookAt(look);

    // HUD 상태: 바뀔 때만 알림
    const li = nearestLanternAt(slots, p.x, p.z);
    const ls = slots[li];
    const nearId = ls?.kind === "lantern" ? ls.person.id : null;
    const slot = Math.max(0, Math.round(slotAtZ(p.z)));
    let region: string | null = null;
    for (let i = Math.min(slots.length - 1, slot); i >= 0; i--) {
      const s = slots[i];
      if (s.kind === "sign") {
        region = s.label;
        break;
      }
    }
    const inGarden = Math.hypot(p.x - GARDEN_CENTER[0], p.z - GARDEN_CENTER[1]) < 14;
    if (p.z > -2) region = null;
    const key = `${region}|${nearId}|${inGarden}`;
    if (key !== lastStatus.current) {
      lastStatus.current = key;
      onStatus({ region, nearId, inGarden });
    }
    const coarse = Math.round(slot / 5) * 5;
    if (coarse !== lastSlot.current) {
      lastSlot.current = coarse;
      onSlot(coarse);
    }
  });

  return (
    <group ref={body}>
      <Avatar key={avatar.url ?? "none"} url={avatar.url} speedRef={speedRef} />
    </group>
  );
}

