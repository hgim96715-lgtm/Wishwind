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
import type { Weather } from "@/lib/weather/types";
import { currentHour, paletteAt, withWeather, type SkyPalette } from "../time-of-day";
import { Avatar } from "./Avatar";
import { Airplane, beamMaterial } from "./scenery";
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
  BRIDGE_HALF_WIDTH,
  branchX,
  bridgeDeckY,
  bridgeHalfLength,
  hash2,
  inWater,
  pathAmount,
  plantableSpot,
  pondDistance,
  pondsNear,
  SLOT_SPACING,
  trailX,
  walkHeight,
  waterLevel,
  type Pond,
} from "./world";

/** 화면 연출 기준 (API의 milestones와 같은 값) */
const SUNLIGHT_AT = 10;
const HOME_PATH_AT = 50;
const MAX_PINWHEELS = 600;
const BUBBLE_MAX = 6;
const PINWHEEL_COLORS = ["#ffd166", "#7cc6f2", "#9ad97a", "#ff9f8a", "#c9a7f2", "#ffb86b"];

export interface Wish {
  id: string;
  body: string;
  pending?: boolean;
  /** 꽂은 자리 [x, z]. 없으면 바람개비 정원 안에 차례로 꽂힘 */
  pos?: [number, number];
}

export interface PlayerStatus {
  /** 지금 있는 곳 이름 (바람개비 정원, 연못가, 갈래 길 …) */
  place: string;
  nearId: string | null;
  inGarden: boolean;
}

/** DOM(조이스틱·버튼)에서 3D 세계로 넘기는 입력. ref라서 매 프레임 읽어도 리렌더 없음 */
export interface WorldControls {
  /** 조이스틱 입력 (-1~1). y가 앞 */
  stick: { x: number; y: number };
  teleport?: (x: number, z: number) => void;
  /** 지금 서 있는 곳 바로 앞, 바람개비를 꽂을 수 있는 자리 [x, z] */
  plantSpot?: () => [number, number];
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
  /** 보는 사람 동네(기본 서울)의 지금 날씨 */
  weather?: Weather | null;
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
  const kind = props.weather?.kind ?? "clear";
  const base = usePalette();
  const palette = useMemo(() => withWeather(base, kind), [base, kind]);
  // 안개·비·눈이면 멀리가 더 빨리 흐려짐
  const fog: [number, number] = kind === "fog" ? [12, 70] : kind === "rain" || kind === "snow" ? [30, 120] : [45, 160];
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
      <fog attach="fog" args={[palette.horizon, ...fog]} />
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]} />
      <directionalLight position={[-30, 40, 10]} intensity={palette.sunIntensity} color={palette.sun} />
      <SkyDome top={palette.top} horizon={palette.horizon} />
      {palette.stars > 0 && <Stars amount={palette.stars} />}
      {(kind === "rain" || kind === "snow") && <Precipitation kind={kind} intensity={props.weather?.intensity ?? 0.6} />}
      <LabelProjector store={labels} />
      <World {...props} palette={palette} labels={labels} />
    </Canvas>
      <LabelOverlay store={labels} />
    </div>
  );
}

function World({ slots, wishes, wishCount, freshId, paused, avatar, controls, onSelect, onStatus, palette, labels, weather }: SceneProps & { palette: SkyPalette; labels: LabelStore }) {
  const player = useRef(new THREE.Vector3(SPAWN[0], heightAt(SPAWN[0], SPAWN[1]), SPAWN[1]));
  const ground = useGroundWeather(weather?.kind ?? "clear");
  // 표지판·말풍선은 플레이어 근처만 그림 → 수천 개 DOM을 만들지 않음 (5칸 단위로만 갱신)
  const [nearSlot, setNearSlot] = useState(0);
  const home = wishCount >= HOME_PATH_AT;
  const night = palette.dark;

  return (
    <>
      <Terrain palette={palette} player={player} ground={ground} />
      <Sea palette={palette} player={player} />
      <Lanterns slots={slots} lamp={palette.lamp} onSelect={onSelect} />
      {/* 해 질 녘(등불 밝기가 오르기 시작할 때)부터 등대에 불이 들어옴 */}
      <Lighthouse lit={night || palette.lamp >= 1.5} home={home} />
      <PinwheelGarden wishes={wishes} wishCount={wishCount} freshId={freshId} player={player} labels={labels} />
      <Butterflies />
      <RoamingButterflies player={player} />
      <Meadow player={player} ground={ground} />
      <FootGlow player={player} amount={night ? 1 : Math.max(0, (palette.lamp - 1.2) / 1.6)} />
      <Ponds nearSlot={nearSlot} />
      <Airplane night={night} />
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

/**
 * 밤하늘 별. 하늘 돔 안쪽 위쪽 반구에 점 2,600개, 반짝임은 셰이더에서 시간으로만 계산 (매 프레임 배열 수정 없음)
 * 저녁 7시 반부터 서서히 뜨고, 흐리거나 비·눈이 오면 보이지 않음
 */
function Stars({ amount }: { amount: number }) {
  const ref = useRef<THREE.Points>(null);
  const { geometry, material } = useMemo(() => {
    const N = 2600;
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      // 위쪽 반구에 고르게 (지평선 가까이는 조금 덜)
      const u = hash2(i, 1.7);
      const v = hash2(i, 9.3);
      const y = 0.08 + Math.pow(u, 0.8) * 0.92;
      const r = Math.sqrt(1 - y * y);
      const a = v * Math.PI * 2;
      pos.set([Math.cos(a) * r * 220, y * 220, Math.sin(a) * r * 220], i * 3);
      seed[i] = hash2(i, 4.4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, amount: { value: 0 }, dpr: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float seed;
        uniform float time;
        uniform float dpr;
        varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          // 대부분은 작은 별, 열에 하나쯤 밝은 별
          gl_PointSize = (2.0 + seed * seed * 4.5) * dpr;
          vAlpha = 0.55 + 0.45 * sin(time * (0.8 + seed * 2.0) + seed * 40.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float amount;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vAlpha * amount;
          gl_FragColor = vec4(1.0, 0.97, 0.88, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    return { geometry: g, material: m };
  }, []);
  const dpr = useThree((st) => st.viewport.dpr);
  useEffect(() => {
    material.uniforms.amount.value = amount;
    material.uniforms.dpr.value = dpr;
  }, [material, amount, dpr]);
  useFrame(({ camera, clock }) => {
    ref.current?.position.copy(camera.position);
    material.uniforms.time.value = clock.elapsedTime;
  });
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={0} />;
}

/** 비·눈 상자 크기 (카메라 기준) */
const W = 20;
const TOP = 18;
const BOTTOM = -4;

/**
 * 비·눈: 카메라를 따라다니는 40×25×40 상자 안에서만 떨어짐 → 언덕 전체에 내리는 것처럼 보이지만 입자는 수천 개뿐.
 * 비는 짧은 선, 눈은 흔들리며 천천히 내리는 점
 */
function Precipitation({ kind, intensity }: { kind: "rain" | "snow"; intensity: number }) {
  const group = useRef<THREE.Group>(null);
  const N = Math.round((kind === "rain" ? 2600 : 1800) * Math.max(0.35, intensity));
  const { geometry, drops } = useMemo(() => {
    const drops = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      drops[i * 3] = (hash2(i, 3.1) - 0.5) * W * 2;
      drops[i * 3 + 1] = BOTTOM + hash2(i, 6.2) * (TOP - BOTTOM);
      drops[i * 3 + 2] = (hash2(i, 8.7) - 0.5) * W * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(kind === "rain" ? N * 6 : N * 3), 3));
    return { geometry: g, drops };
  }, [N, kind]);
  const material = useMemo(
    () =>
      kind === "rain"
        ? new THREE.LineBasicMaterial({ color: "#c9d6ea", transparent: true, opacity: 0.45, depthWrite: false })
        : new THREE.PointsMaterial({ color: "#ffffff", size: 0.16, map: flakeTexture, alphaTest: 0.05, transparent: true, opacity: 0.95, depthWrite: false }),
    [kind],
  );

  useFrame(({ camera, clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = group.current;
    if (!g) return;
    g.position.set(camera.position.x, camera.position.y - 4, camera.position.z);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const t = clock.elapsedTime;
    const fall = kind === "rain" ? 22 : 1.6;
    for (let i = 0; i < N; i++) {
      let y = drops[i * 3 + 1] - fall * dt * (0.8 + hash2(i, 1.1) * 0.4);
      if (y < BOTTOM) y = TOP;
      drops[i * 3 + 1] = y;
      const x = drops[i * 3] + (kind === "snow" ? Math.sin(t * 0.7 + i) * 0.6 : 0);
      const z = drops[i * 3 + 2];
      if (kind === "rain") {
        // 바람에 살짝 기운 빗줄기
        arr.set([x, y, z, x + 0.08, y + 0.55, z], i * 6);
      } else {
        arr.set([x, y, z], i * 3);
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <group ref={group}>
      {kind === "rain" ? (
        <lineSegments geometry={geometry} material={material} frustumCulled={false} />
      ) : (
        <points geometry={geometry} material={material} frustumCulled={false} />
      )}
    </group>
  );
}

/* ───────────────────────── 지형 ───────────────────────── */

/**
 * 지형 중심을 정점 간격(180/120 = 1.5)의 배수로만 옮김. 10 단위로 옮기면 정점 격자가 매번 다른 자리에 놓여
 * 연못 물가 모양이 달라져, 걸어갈 때 연못이 줄었다 커졌다 하는 것처럼 보였음
 */
const snap = (v: number) => Math.round(v / 15) * 15;

/**
 * 플레이어를 따라다니는 지형 한 장(180×180). 멀리 걸어가면 중심을 옮겨 높이·색을 다시 계산
 * → 수 km 길이의 길이라도 정점 1.4만 개로 끝남
 */
/* ───────────────────────── 날씨에 따른 땅 ───────────────────────── */

type GroundState = { wet: number; snow: number };

/**
 * 비가 오면 땅이 서서히 젖고(약 20초), 눈이 오면 서서히 쌓임(약 40초). 그치면 천천히 마르고 녹음.
 * 페이지를 열었을 때 이미 오고 있었다면 어느 정도 젖고 쌓인 상태에서 시작함
 */
function useGroundWeather(kind: Weather["kind"]): React.RefObject<GroundState> {
  const ground = useRef<GroundState>({ wet: kind === "rain" ? 0.6 : 0, snow: kind === "snow" ? 0.45 : 0 });
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const g = ground.current;
    g.wet = approach(g.wet, kind === "rain" ? 1 : 0, dt / (kind === "rain" ? 20 : 60));
    g.snow = approach(g.snow, kind === "snow" ? 1 : 0, dt / (kind === "snow" ? 40 : 90));
  });
  return ground;
}

function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(target, v + step) : Math.max(target, v - step);
}

/** 밤에 캐릭터 발밑을 은은하게 밝힘: 바닥의 둥근 빛 + 캐릭터를 비추는 작은 불빛 */
const footGlowTexture = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,236,196,0.75)");
  grad.addColorStop(0.45, "rgba(255,226,170,0.3)");
  grad.addColorStop(1, "rgba(255,226,170,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

function FootGlow({ player, amount }: { player: React.RefObject<THREE.Vector3>; amount: number }) {
  const group = useRef<THREE.Group>(null);
  const disc = useRef<THREE.Mesh>(null);
  const up = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const normal = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const p = player.current;
    group.current?.position.set(p.x, walkHeight(p.x, p.z), p.z);
    // 빛 원판을 언덕 기울기에 맞춰 눕힘 (평평하면 비탈에 반쯤 묻혀 잘려 보임)
    const e = 0.6;
    normal.set(heightAt(p.x - e, p.z) - heightAt(p.x + e, p.z), 2 * e, heightAt(p.x, p.z - e) - heightAt(p.x, p.z + e)).normalize();
    disc.current?.quaternion.setFromUnitVectors(up, normal);
  });
  if (amount <= 0.01) return null;
  return (
    <group ref={group}>
      <mesh ref={disc} position-y={0.06} renderOrder={2}>
        <planeGeometry args={[3.2, 3.2]} />
        <meshBasicMaterial map={footGlowTexture} transparent opacity={amount * 0.9} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </mesh>
      <pointLight position={[0, 1.6, 0.6]} color="#ffe2b0" intensity={amount * 3.2} distance={5} decay={1.6} />
    </group>
  );
}

function Terrain({ palette, player, ground }: { palette: SkyPalette; player: React.RefObject<THREE.Vector3>; ground: React.RefObject<GroundState> }) {
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
  const colors = useMemo(() => ({ grass: new THREE.Color(), sand: new THREE.Color(), dirt: new THREE.Color(), snow: new THREE.Color("#eef2f7"), c: new THREE.Color() }), []);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  // 마지막으로 색칠한 젖음·눈 정도 (조금씩 바뀔 때마다 다시 칠함)
  const painted = useRef({ wet: -1, snow: -1 });

  /** 땅 색: 모래→풀→흙길, 비가 오면 젖어서 짙어지고, 눈이 오면 높은 곳부터 하얗게 덮임 */
  const paint = () => {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    const { wet, snow } = ground.current;
    colors.grass.set(palette.grass);
    colors.sand.set(palette.sand);
    colors.dirt.set(palette.sand).lerp(new THREE.Color("#a98b66"), 0.5);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const g = grassAmount(x, z);
      const path = pathAmount(x, z) * g;
      colors.c.copy(colors.sand).lerp(colors.grass, g);
      // 길(큰길·갈래 길·광장 길)은 흙빛
      colors.c.lerp(colors.dirt, path);
      // 젖은 땅: 풀은 짙은 초록, 흙길은 진흙처럼 더 어둡게
      if (wet > 0) colors.c.multiplyScalar(1 - wet * (0.22 + 0.2 * path));
      if (snow > 0) {
        // 높은 언덕일수록, 사람이 덜 다닌 곳일수록 먼저 덮이고 바닷가 모래는 덜 쌓임
        const lumpy = 0.75 + 0.25 * Math.sin(x * 0.37 + z * 0.21) * Math.sin(z * 0.43 - x * 0.17);
        const height = THREE.MathUtils.clamp(0.75 + y * 0.12, 0.6, 1.15);
        const cover = THREE.MathUtils.clamp((snow * 1.25 * lumpy * height - 0.1) * (1 - 0.45 * path) * (0.35 + 0.65 * g), 0, 0.97);
        colors.c.lerp(colors.snow, cover);
      }
      col.setXYZ(i, colors.c.r, colors.c.g, colors.c.b);
    }
    col.needsUpdate = true;
    painted.current = { wet, snow };
    // 젖으면 살짝 반들거림
    if (material.current) material.current.roughness = 1 - wet * 0.4;
  };

  const rebuild = (cx: number, cz: number) => {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3] + cx;
      const z = base[i * 3 + 2] + cz;
      pos.setXYZ(i, x, heightAt(x, z), z);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    center.current = { x: cx, z: cz };
    paint();
  };

  // 시간대가 바뀌면 색만 다시 계산
  useLayoutEffect(() => {
    const p = player.current;
    rebuild(snap(p.x), snap(p.z));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette.grass, palette.sand]);

  useFrame(() => {
    const p = player.current;
    const c = center.current;
    if (c && Math.hypot(p.x - c.x, p.z - c.z) > 30) rebuild(snap(p.x), snap(p.z));
    else {
      const g = ground.current;
      const d = painted.current;
      if (Math.abs(g.wet - d.wet) > 0.02 || Math.abs(g.snow - d.snow) > 0.02) paint();
    }
  });

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <meshStandardMaterial ref={material} vertexColors roughness={1} />
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

/** 눈송이: 기본 Points는 네모로 그려져서 둥글고 가장자리가 흐린 점 텍스처를 씌움 */
const flakeTexture = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.85)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
})();

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
 * 등불 빛무리. 기본 PointsMaterial은 카메라에 가까울수록 한없이 커져서, 들판 등불 옆을 지나가면
 * 화면을 덮는 큰 원이 생김 → 화면 크기 상한(maxPx)을 두고, 아주 가까우면 흐리게 사라지게 함
 */
const haloMaterial = new THREE.ShaderMaterial({
  uniforms: {
    map: { value: haloTexture },
    size: { value: 1.8 },
    scale: { value: 400 },
    maxPx: { value: 110 },
  },
  vertexShader: /* glsl */ `
    uniform float size;
    uniform float scale;
    uniform float maxPx;
    varying float vFade;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      float d = max(-mv.z, 0.001);
      gl_PointSize = min(size * scale / d, maxPx);
      vFade = smoothstep(2.0, 6.0, d);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D map;
    varying float vFade;
    void main() {
      vec4 c = texture2D(map, gl_PointCoord);
      gl_FragColor = vec4(c.rgb, c.a * vFade);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});

/**
 * 길가 정원 등 = 실종자 한 명. 수천 개라도 기둥·지붕·등 3개의 InstancedMesh(draw call 3번)로 그림
 * 클릭하면 instanceId로 어떤 분의 등불인지 찾음
 */
function Lanterns({ slots, lamp, onSelect }: { slots: Slot[]; lamp: number; onSelect: (id: string) => void }) {
  // 빛무리 크기 기준 = 화면 높이(기기 픽셀)의 절반 (three의 sizeAttenuation과 같은 계산)
  const bufferHeight = useThree((st) => st.size.height * st.viewport.dpr);
  useLayoutEffect(() => {
    haloMaterial.uniforms.scale.value = bufferHeight / 2;
  }, [bufferHeight]);
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
          <primitive object={haloMaterial} attach="material" />
        </points>
      )}
    </group>
  );
}


/* ───────────────────────── 등대 ───────────────────────── */

/** 길 잃은 사람을 집으로 안내하는 빛. 밤에는 빛줄기가 바다를 천천히 비추고, 바람개비 50개면 낮에도 환하게 켜짐 */
function Lighthouse({ lit: dusk, home }: { lit: boolean; home: boolean }) {
  const [lx, lz] = LIGHTHOUSE;
  const y = heightAt(lx, lz);
  const beam = useRef<THREE.Group>(null);
  const lit = dusk || home;
  const beamMat = useMemo(() => beamMaterial(home ? 0.3 : 0.2), [home]);
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
              <mesh key={r} rotation={[0, r, Math.PI / 2]} position={[Math.cos(r) * 16, 0, -Math.sin(r) * 16]} material={beamMat}>
                <coneGeometry args={[3, 32, 24, 1, true]} />
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
  /*
   * 자리 정하기
   * - 꽂은 자리(pos)가 있는 메시지: 언덕 어디든 그 자리
   * - 자리가 없는 옛 메시지·목록 밖 메시지: 정원 해바라기씨 배열. 바깥쪽(큰 k)일수록 최근 메시지
   */
  const { spots, messageAt } = useMemo(() => {
    const shown = wishes.slice(0, n);
    const placed = shown.filter((w) => w.pos);
    const unplaced = shown.filter((w) => !w.pos);
    const spiral = Math.max(0, n - placed.length);
    const list: [number, number, number][] = Array.from({ length: spiral }, (_, k) => pinwheelSpot(k));
    const map = new Map<number, Wish>();
    unplaced.forEach((w, i) => map.set(spiral - 1 - i, w));
    for (const w of placed) {
      const [x, z] = w.pos!;
      map.set(list.length, w);
      list.push([x, heightAt(x, z), z]);
    }
    return { spots: list, messageAt: map };
  }, [wishes, n]);
  const total = spots.length;
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
    for (let k = 0; k < total; k++) {
      const [x, y, z] = spots[k];
      sticks.current?.setMatrixAt(k, m.makeTranslation(x, y + 0.55, z));
      rotors.current?.setColorAt(k, c.set(PINWHEEL_COLORS[k % PINWHEEL_COLORS.length]));
    }
    if (sticks.current) {
      sticks.current.count = total;
      sticks.current.instanceMatrix.needsUpdate = true;
    }
    if (rotors.current) {
      rotors.current.count = total;
      if (rotors.current.instanceColor) rotors.current.instanceColor.needsUpdate = true;
    }
  }, [total, spots]);

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
      for (let k = 0; k < total; k++) {
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

const FLOWER_COLORS = ["#ffe08a", "#f7b6c8", "#c9b5f0", "#ffffff", "#ffc98a", "#ff9fb0", "#a8d4ff"];

/**
 * 언덕 전체 들꽃. 플레이어 주변 120×120만 그리고, 멀리 걸어가면 그 자리 기준으로 다시 깜
 * 격자 칸마다 같은 난수(hash2)를 쓰므로 돌아와도 꽃 자리가 그대로임. 꽃밭은 큰 물결 무늬로 군데군데 몰림
 */
function Meadow({ player, ground }: { player: React.RefObject<THREE.Vector3>; ground: React.RefObject<GroundState> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const COUNT = 5200;
  const RANGE = 60;
  const CELL = 1.6;
  const center = useRef<{ x: number; z: number } | null>(null);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const c = useMemo(() => new THREE.Color(), []);

  const rebuild = (cx: number, cz: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    let i = 0;
    const gx0 = Math.floor((cx - RANGE) / CELL);
    const gz0 = Math.floor((cz - RANGE) / CELL);
    const cells = Math.ceil((RANGE * 2) / CELL);
    for (let a = 0; a < cells && i < COUNT; a++) {
      for (let b = 0; b < cells && i < COUNT; b++) {
        const gx = gx0 + a;
        const gz = gz0 + b;
        const h = hash2(gx, gz);
        const patch = 0.5 + 0.5 * Math.sin(gx * CELL * 0.11 + 1.3) * Math.sin(gz * CELL * 0.09 + 0.4);
        if (h > 0.12 + patch * 0.6) continue;
        const x = (gx + hash2(gz, gx)) * CELL;
        const z = (gz + hash2(gx + 7, gz - 3)) * CELL;
        if (grassAmount(x, z) < 0.8 || pathAmount(x, z) > 0.05) continue;
        if (pondsNear(z, 7).some((p) => pondDistance(p, x, z) < 1.15)) continue;
        const s = 0.07 + hash2(gz + 11, gx) * 0.07;
        m.makeScale(s, s * 0.75, s).setPosition(x, heightAt(x, z) + 0.12, z);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, c.set(FLOWER_COLORS[Math.floor(hash2(gz, gx + 5) * FLOWER_COLORS.length)]));
        i++;
      }
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    center.current = { x: cx, z: cz };
  };

  useLayoutEffect(() => {
    const p = player.current;
    rebuild(Math.round(p.x / 10) * 10, Math.round(p.z / 10) * 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const p = player.current;
    const cc = center.current;
    if (cc && Math.hypot(p.x - cc.x, p.z - cc.z) > 20) rebuild(Math.round(p.x / 10) * 10, Math.round(p.z / 10) * 10);
    // 눈이 쌓이면 꽃이 눈 속으로 묻힘
    if (ref.current) {
      const snow = ground.current.snow;
      ref.current.position.y = -0.24 * Math.min(1, snow * 1.3);
      ref.current.visible = snow < 0.95;
    }
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}

/* ───────────────────────── 연못과 다리 ───────────────────────── */

/** 플레이어 근처(앞뒤 160) 연못만 그림 */
function Ponds({ nearSlot }: { nearSlot: number }) {
  const ponds = useMemo(() => pondsNear(-nearSlot * SLOT_SPACING, 160), [nearSlot]);
  return (
    <>
      {ponds.map((p) => (
        <PondView key={p.id} pond={p} />
      ))}
    </>
  );
}

const BRIDGE_COLOR = "#5f9e8f";

/**
 * 연못: 수련 잎이 떠 있는 잔잔한 물 + 그 위를 둥글게 건너는 초록 나무다리.
 * 다리는 늘 z 방향으로 놓이고, 높이는 world.ts의 bridgeDeckY와 같아서 캐릭터가 그 위를 걸음
 */
function PondView({ pond }: { pond: Pond }) {
  const water = waterLevel(pond);
  const L = bridgeHalfLength(pond);
  const W = BRIDGE_HALF_WIDTH;

  const { planks, posts, rails, pads } = useMemo(() => {
    const N = 16;
    const planks: { y: number; z: number; tilt: number; len: number }[] = [];
    const posts: [number, number, number][] = [];
    const rails: { x: number; y: number; z: number; tilt: number; len: number }[] = [];
    for (let i = 0; i < N; i++) {
      const z0 = -L + (2 * L * i) / N;
      const z1 = -L + (2 * L * (i + 1)) / N;
      const y0 = bridgeDeckY(pond, z0);
      const y1 = bridgeDeckY(pond, z1);
      const len = Math.hypot(z1 - z0, y1 - y0);
      // rotation-x가 양수면 +z 끝이 내려가므로 기울기 부호를 뒤집음
      const tilt = -Math.atan2(y1 - y0, z1 - z0);
      planks.push({ y: (y0 + y1) / 2, z: (z0 + z1) / 2, tilt, len });
      for (const side of [-1, 1]) {
        if (i % 2 === 0) posts.push([side * (W - 0.05), y0, z0]);
        rails.push({ x: side * (W - 0.05), y: (y0 + y1) / 2 + 0.7, z: (z0 + z1) / 2, tilt, len });
      }
    }
    for (const side of [-1, 1]) posts.push([side * (W - 0.05), bridgeDeckY(pond, L), L]);

    const pads: { x: number; z: number; r: number; flower: boolean }[] = [];
    for (let k = 0; pads.length < 14 && k < 80; k++) {
      const a = hash2(k, pond.x) * Math.PI * 2;
      const d = Math.sqrt(hash2(pond.z, k)) * 0.8;
      const x = Math.cos(a) * d * pond.rx;
      const z = Math.sin(a) * d * pond.rz;
      if (Math.abs(x) < W + 0.6) continue; // 다리 밑은 비움
      pads.push({ x, z, r: 0.3 + hash2(k + 3, k) * 0.25, flower: hash2(k, k + 9) < 0.35 });
    }
    return { planks, posts, rails, pads };
  }, [pond, L, W]);

  return (
    <group position={[pond.x, 0, pond.z]}>
      <mesh rotation-x={-Math.PI / 2} position={[0, water, 0]} scale={[pond.rx * 0.98, pond.rz * 0.98, 1]}>
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#6fa9b8" roughness={0.15} metalness={0.15} transparent opacity={0.88} />
      </mesh>
      {pads.map((p, i) => (
        <group key={i} position={[p.x, water + 0.02, p.z]}>
          <mesh>
            <cylinderGeometry args={[p.r, p.r, 0.02, 12]} />
            <meshStandardMaterial color="#5e9a5a" roughness={0.9} />
          </mesh>
          {p.flower && (
            <mesh position={[0.05, 0.08, 0.05]} scale={[1, 0.7, 1]}>
              <sphereGeometry args={[0.1, 8, 6]} />
              <meshStandardMaterial color="#f6b3c8" roughness={0.8} />
            </mesh>
          )}
        </group>
      ))}
      {planks.map((p, i) => (
        <mesh key={`d${i}`} position={[0, p.y - 0.05, p.z]} rotation-x={p.tilt}>
          <boxGeometry args={[W * 2, 0.1, p.len * 1.04]} />
          <meshStandardMaterial color={i % 2 ? "#6aa898" : BRIDGE_COLOR} roughness={0.85} />
        </mesh>
      ))}
      {posts.map(([x, y, z], i) => (
        <mesh key={`p${i}`} position={[x, y + 0.35, z]}>
          <boxGeometry args={[0.08, 0.75, 0.08]} />
          <meshStandardMaterial color={BRIDGE_COLOR} roughness={0.85} />
        </mesh>
      ))}
      {rails.map((r, i) => (
        <mesh key={`r${i}`} position={[r.x, r.y, r.z]} rotation-x={r.tilt}>
          <boxGeometry args={[0.07, 0.07, r.len * 1.04]} />
          <meshStandardMaterial color={BRIDGE_COLOR} roughness={0.85} />
        </mesh>
      ))}
    </group>
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

/**
 * 언덕 여기저기 꽃밭을 맴도는 나비 24마리. 플레이어 주변 격자(16칸)마다 꽃밭 몇 곳을 고르고,
 * 걸어가서 꽃밭이 바뀌면 나비가 새 꽃밭으로 천천히 날아감 (순간 이동 없음)
 */
function RoamingButterflies({ player }: { player: React.RefObject<THREE.Vector3> }) {
  const COLORS = ["#ffd166", "#7cc6f2", "#ff9f8a", "#c9a7f2", "#9ad97a", "#ffb86b", "#f7b6c8", "#ffffff"];
  const list = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => COLORS[i % COLORS.length]).map((color, i) => ({
        tex: wingTexture(color),
        phase: i * 2.3,
        r: 1.5 + (i % 3) * 0.9,
        w: 0.4 + (i % 4) * 0.08,
        center: new THREE.Vector2(Infinity, Infinity),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const CELL = 16;
  const lastCell = useRef("");
  const targets = useRef<[number, number][]>([]);

  useFrame((_, dt) => {
    const p = player.current;
    const cx = Math.round(p.x / CELL);
    const cz = Math.round(p.z / CELL);
    const key = `${cx},${cz}`;
    if (key !== lastCell.current) {
      lastCell.current = key;
      const found: [number, number][] = [];
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          const gx = cx + dx;
          const gz = cz + dz;
          if (hash2(gx + 0.5, gz + 0.5) > 0.55) continue;
          const x = gx * CELL + (hash2(gz, gx) - 0.5) * 10;
          const z = gz * CELL + (hash2(gx, gz) - 0.5) * 10;
          if (grassAmount(x, z) > 0.8 && !inWater(x, z)) found.push([x, z]);
        }
      }
      targets.current = found;
    }
    const t = targets.current;
    if (!t.length) return;
    list.forEach((b, i) => {
      // 나비마다 다른 꽃밭으로 (꽃밭이 적으면 몇 마리씩 함께)
      const [tx, tz] = t[(i * 7) % t.length];
      if (!Number.isFinite(b.center.x)) {
        b.center.set(tx, tz);
        return;
      }
      const d = Math.hypot(tx - b.center.x, tz - b.center.y);
      if (d < 0.01) return;
      const step = Math.min(d, dt * 3.5);
      b.center.x += ((tx - b.center.x) / d) * step;
      b.center.y += ((tz - b.center.y) / d) * step;
    });
  });

  return (
    <>
      {list.map((b, i) => (
        <Butterfly key={i} tex={b.tex} phase={b.phase} r={b.r} w={b.w} center={b.center} />
      ))}
    </>
  );
}

function Butterfly({ tex, phase, r, w, center }: { tex: THREE.Texture | null; phase: number; r: number; w: number; center?: THREE.Vector2 }) {
  const g = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const [gx, gz] = GARDEN_CENTER;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * w + phase;
    const cx = center ? center.x : gx;
    const cz = center ? center.y : gz;
    if (!Number.isFinite(cx)) return;
    const x = cx + Math.cos(t) * r * (1 + 0.25 * Math.sin(t * 2.3));
    const z = cz + Math.sin(t) * r * (1 + 0.25 * Math.cos(t * 1.7));
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
      player.current.set(x, walkHeight(x, z), z);
    };
    c.plantSpot = () => {
      const p = player.current;
      // 캐릭터 바로 앞 (발밑에 꽂으면 캐릭터에 가려 보이지 않음)
      return plantableSpot(p.x - Math.sin(yaw.current) * 1.4, p.z - Math.cos(yaw.current) * 1.4);
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
      c.plantSpot = undefined;
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
      const mx = fx * dir * speed * dt;
      const mz = fz * dir * speed * dt;
      // 연못 물에는 들어가지 않음 (다리 위는 걸을 수 있음). 막히면 물가를 따라 미끄러지듯 비켜 감
      // 이미 물가 안쪽에 서 있으면(순간 이동 직후 등) 어느 쪽으로든 나갈 수 있게 함
      const stuck = inWater(p.x, p.z);
      for (const [ax, az] of [[mx, mz], [mx, 0], [0, mz]] as const) {
        const [nx, nz] = clampToLand(p.x + ax, p.z + az, slots.length);
        if (stuck || !inWater(nx, nz)) {
          p.set(nx, walkHeight(nx, nz), nz);
          break;
        }
      }
      speedRef.current = speed;
    } else {
      // 제자리에서 돌 때는 걷는 동작만 살짝
      speedRef.current = Math.abs(ix) > 0.3 ? 1 : 0;
      p.y = walkHeight(p.x, p.z);
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
    const inGarden = Math.hypot(p.x - GARDEN_CENTER[0], p.z - GARDEN_CENTER[1]) < 14;
    const place = placeName(p.x, p.z, inGarden);
    const key = `${place}|${nearId}|${inGarden}`;
    if (key !== lastStatus.current) {
      lastStatus.current = key;
      onStatus({ place, nearId, inGarden });
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

/** 화면 위에 보여 줄 지금 있는 곳 이름 */
function placeName(x: number, z: number, inGarden: boolean) {
  if (inGarden) return "바람개비 정원";
  if (pondsNear(z, 4).some((p) => pondDistance(p, x, z) < 1.8)) return "연못가";
  if (Math.hypot(x - LIGHTHOUSE[0], z - LIGHTHOUSE[1]) < 10) return "등대 아래";
  if (z > -2) return "등대 언덕";
  const bx = branchX(slotAtZ(z));
  if (bx !== null && Math.abs(x - bx) < 4 && bx - trailX(slotAtZ(z)) > 3) return "갈래 길";
  return "등불 길";
}
