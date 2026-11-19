"use client";

import { Billboard, Cloud, Clouds, Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { currentHour, paletteAt, type SkyPalette } from "./time-of-day";
import {
  controlPoints,
  nearestLantern,
  regionAt,
  type Slot,
} from "./path-layout";

const STONE = "#ffffff";
const LAMP = "#ffc76b";
const POST = "#a8845c";

export interface WalkState {
  /** 현재 위치 (slot 실수 인덱스) */
  at: number;
  region: string | null;
  /** 가까이 있는 등불의 실종자 id */
  nearId: string | null;
}

/** 구름 연출 기준 (API의 milestones와 같은 값) */
const SUNLIGHT_AT = 10;
const HOME_PATH_AT = 50;

interface SceneProps {
  slots: Slot[];
  /** 길 전체에 모인 응원 구름 수 (모든 실종자에게 건네는 구름) */
  cloudCount: number;
  /** 카드가 열려 있으면 걷기 입력을 멈춤 */
  paused: boolean;
  onSelect: (id: string) => void;
  onWalk: (state: WalkState) => void;
  /** 화면 버튼(◀ ▶)에서 한 칸씩 움직일 때 쓰는 ref */
  stepRef: React.RefObject<((delta: number) => void) | null>;
  /** 지역 메뉴에서 특정 slot으로 바로 이동할 때 쓰는 ref */
  jumpRef: React.RefObject<((slot: number) => void) | null>;
}

/** 1분마다 현재 시각의 하늘 색을 다시 계산 */
function usePalette(): SkyPalette {
  const [palette, setPalette] = useState(() => paletteAt(currentHour()));
  useEffect(() => {
    const id = setInterval(() => setPalette(paletteAt(currentHour())), 60_000);
    return () => clearInterval(id);
  }, []);
  return palette;
}

export default function CloudPathScene(props: SceneProps & { onPalette?: (p: SkyPalette) => void }) {
  const palette = usePalette();
  const { onPalette } = props;
  useEffect(() => onPalette?.(palette), [palette, onPalette]);
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 55, near: 0.1, far: 120, position: [0, 2.4, 4] }}
      gl={{ antialias: true, powerPreference: "low-power" }}
      aria-hidden
    >
      <color attach="background" args={[palette.horizon]} />
      <fog attach="fog" args={[palette.horizon, 30, 95]} />
      {/* 그늘도 따뜻한 빛으로 → 구름이 잿빛이 되지 않음 */}
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]} />
      <directionalLight position={[-8, 12, -20]} intensity={palette.sunIntensity} color={palette.sun} />
      <SkyDome top={palette.top} horizon={palette.horizon} />
      <World {...props} palette={palette} />
    </Canvas>
  );
}

function World({ slots, cloudCount, paused, onSelect, onWalk, stepRef, jumpRef, palette }: SceneProps & { palette: SkyPalette }) {
  const curve = useMemo(() => {
    const pts = controlPoints(slots.length).map(([x, y, z]) => new THREE.Vector3(x, y, z));
    return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
  }, [slots.length]);

  const last = slots.length - 1;
  const pointAt = (i: number) => curve.getPoint(THREE.MathUtils.clamp(i / last, 0, 1));
  // 세로 화면(모바일)은 가로 시야가 좁아 양옆 등불이 잘림 → 길 쪽으로 붙임
  const portrait = useThree((st) => st.size.width < st.size.height);
  const sideOffset = portrait ? 1.5 : 2.4;

  return (
    <>
      <Walker curve={curve} slots={slots} paused={paused} onSelect={onSelect} onWalk={onWalk} stepRef={stepRef} jumpRef={jumpRef} />
      <Stones curve={curve} count={last * 2} golden={cloudCount >= HOME_PATH_AT} />
      <PathClouds curve={curve} count={cloudCount} golden={cloudCount >= HOME_PATH_AT} />
      <SoftClouds curve={curve} slotCount={slots.length} color={palette.cloud} />
      {slots.map((slot, i) => {
        if (slot.kind === "lantern") {
          return (
            <Lantern
              key={slot.person.id}
              position={sideOf(curve, i / last, slot.side * sideOffset)}
              onSelect={() => onSelect(slot.person.id)}
              lamp={palette.lamp}
              home={cloudCount >= HOME_PATH_AT}
            />
          );
        }
        if (slot.kind === "sign") {
          const p = pointAt(i);
          return (
            <group key={slot.region}>
              {cloudCount >= SUNLIGHT_AT && (
                <group position={[p.x, p.y, p.z]}>
                  <SunShaft golden={cloudCount >= HOME_PATH_AT} />
                </group>
              )}
            <Html position={[p.x, p.y + 3.2, p.z]} center distanceFactor={4} zIndexRange={[10, 0]}>
              <div className="pointer-events-none whitespace-nowrap rounded-full bg-white/80 px-4 py-1.5 text-sm font-medium text-[#5b4d3c] shadow-sm backdrop-blur">
                {slot.label} · {slot.count}명
              </div>
            </Html>
            </group>
          );
        }
        return null;
      })}
    </>
  );
}

function sideOf(curve: THREE.CatmullRomCurve3, u: number, offset: number): [number, number, number] {
  const p = curve.getPoint(u);
  const tangent = curve.getTangent(u);
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  return [p.x + normal.x * offset, p.y, p.z + normal.z * offset];
}

/** 걷기: 입력은 목표 위치만 바꾸고, 카메라는 매 프레임 목표로 부드럽게 따라감 */
function Walker({
  curve,
  slots,
  paused,
  onSelect,
  onWalk,
  stepRef,
  jumpRef,
}: Omit<SceneProps, "slots" | "cloudCount"> & { curve: THREE.CatmullRomCurve3; slots: Slot[] }) {
  const camera = useThree((s) => s.camera);
  const getState = useThree((s) => s.get);
  const portrait = useThree((s) => s.size.width < s.size.height);
  useEffect(() => {
    // 카메라는 three 객체라 직접 바꿔야 함 → 훅 반환값 대신 store에서 꺼내 수정
    const cam = getState().camera;
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.fov = portrait ? 72 : 55;
      cam.updateProjectionMatrix();
    }
  }, [getState, portrait]);
  const gl = useThree((s) => s.gl);
  const last = slots.length - 1;
  const target = useRef(0.6);
  const current = useRef(0);
  const lastReported = useRef<string>("");
  const pausedRef = useRef(paused);
  useLayoutEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const move = (d: number) => {
      target.current = THREE.MathUtils.clamp(target.current + d, 0, last);
    };
    stepRef.current = move;
    // 먼 지역으로 갈 때는 카메라가 길을 따라 날아가지 않고 바로 옮겨짐 (수십 칸을 스치면 어지러움)
    jumpRef.current = (slot: number) => {
      const to = THREE.MathUtils.clamp(slot - 0.4, 0, last);
      target.current = to;
      current.current = to;
    };

    const onKey = (e: KeyboardEvent) => {
      if (pausedRef.current || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (["ArrowUp", "ArrowRight", "w", "d"].includes(e.key)) move(1);
      else if (["ArrowDown", "ArrowLeft", "s", "a"].includes(e.key)) move(-1);
      else if (e.key === "Enter") {
        const i = nearestLantern(slots, current.current);
        const s = slots[i];
        if (s?.kind === "lantern") onSelect(s.person.id);
        return;
      } else return;
      e.preventDefault();
    };
    const onWheel = (e: WheelEvent) => {
      if (pausedRef.current) return;
      move(e.deltaY * 0.004);
    };
    // 드래그(모바일 스와이프 포함): 위·왼쪽으로 밀면 앞으로
    let drag: { x: number; y: number } | null = null;
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => (drag = { x: e.clientX, y: e.clientY });
    const onMoveP = (e: PointerEvent) => {
      if (!drag || pausedRef.current) return;
      move(((drag.y - e.clientY) + (drag.x - e.clientX)) * 0.01);
      drag = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => (drag = null);

    window.addEventListener("keydown", onKey);
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMoveP);
    window.addEventListener("pointerup", onUp);
    return () => {
      stepRef.current = null;
      jumpRef.current = null;
      window.removeEventListener("keydown", onKey);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMoveP);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gl, last, onSelect, slots, stepRef, jumpRef]);

  const pos = useMemo(() => new THREE.Vector3(), []);
  const ahead = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    // 프레임 시간에 비례한 지수 감쇠 → 주사율(60/120Hz)이 달라도 같은 속도
    current.current += (target.current - current.current) * (1 - Math.exp(-dt * 3));
    const u = current.current / last;
    curve.getPoint(THREE.MathUtils.clamp(u, 0, 1), pos);
    curve.getPoint(THREE.MathUtils.clamp((current.current + 2) / last, 0, 1), ahead);
    dir.subVectors(ahead, pos).setY(0).normalize();
    const back = portrait ? 5 : 4;
    camera.position.set(pos.x - dir.x * back, pos.y + (portrait ? 2.8 : 2.4), pos.z - dir.z * back);
    camera.lookAt(ahead.x, ahead.y + 0.9, ahead.z);

    // HUD 갱신은 값이 바뀔 때만 → React 리렌더를 프레임마다 일으키지 않음
    const near = nearestLantern(slots, current.current);
    const nearSlot = slots[near];
    const state: WalkState = {
      at: Math.round(current.current * 10) / 10,
      region: regionAt(slots, current.current),
      nearId: nearSlot?.kind === "lantern" ? nearSlot.person.id : null,
    };
    const key = `${Math.round(current.current)}|${state.region}|${state.nearId}`;
    if (key !== lastReported.current) {
      lastReported.current = key;
      onWalk(state);
    }
  });

  return null;
}

/** 카메라를 따라다니는 하늘 구: 위→지평선 그라데이션. 안개 영향을 받지 않음 */
function SkyDome({ top, horizon }: { top: string; horizon: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color() },
          horizon: { value: new THREE.Color() },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vDir;
          void main(){ float h = clamp(vDir.y * 1.6 + 0.15, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.8)), 1.0); }`,
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
      <sphereGeometry args={[100, 32, 16]} />
    </mesh>
  );
}

/** 구름 징검다리: 한 칸 = 몽글한 공 4개. 수백 개라도 InstancedMesh 하나 = draw call 1번 */
function Stones({ curve, count, golden }: { curve: THREE.CatmullRomCurve3; count: number; golden: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const PUFFS = 4;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    // 의사 난수: 새로고침해도 같은 모양
    const rand = (n: number) => {
      const x = Math.sin(n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < count; i++) {
      const c = curve.getPoint(i / Math.max(1, count - 1));
      for (let k = 0; k < PUFFS; k++) {
        const r = 0.45 + rand(i * 7 + k) * 0.35;
        const a = (k / PUFFS) * Math.PI * 2 + rand(i + k * 3);
        p.set(c.x + Math.cos(a) * 0.55, c.y - 0.45 + rand(i * 3 + k) * 0.15, c.z + Math.sin(a) * 0.45);
        s.set(r * 1.25, r * 0.7, r);
        m.compose(p, q, s);
        mesh.setMatrixAt(i * PUFFS + k, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [curve, count]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count * PUFFS]} frustumCulled={false}>
      <sphereGeometry args={[1, 18, 12]} />
      {/* 구름 50조각: 징검다리 전체가 은은한 금빛 = "집으로 가는 길" */}
      <meshStandardMaterial color={STONE} emissive={golden ? "#ffe4b0" : "#fff4e8"} emissiveIntensity={golden ? 0.6 : 0.4} roughness={1} />
    </instancedMesh>
  );
}

/** 길 아래·옆으로 몽글몽글 깔리는 구름. 흩어지지 않고 길 쪽으로 모여 있는 배치 */
function SoftClouds({ curve, slotCount, color }: { curve: THREE.CatmullRomCurve3; slotCount: number; color: string }) {
  const spots = useMemo(() => {
    const n = Math.max(6, Math.ceil(slotCount / 3));
    return Array.from({ length: n }, (_, i) => {
      const u = i / (n - 1);
      const p = curve.getPoint(u);
      const side = i % 2 === 0 ? 1 : -1;
      return { key: i, pos: [p.x + side * (6 + (i % 3) * 2), p.y - 3, p.z] as const, seed: i + 1 };
    });
  }, [curve, slotCount]);

  return (
    <Clouds material={THREE.MeshLambertMaterial} limit={spots.length * 6 + 40}>
      {spots.map((c) => (
        <Cloud
          key={c.key}
          seed={c.seed}
          position={c.pos}
          segments={6}
          bounds={[4, 1, 3]}
          volume={5}
          speed={0.08}
          growth={3}
          color={color}
          opacity={1}
          fade={60}
        />
      ))}
      {/* 먼 지평선의 큰 구름 바다 */}
      <Cloud seed={999} position={[0, -9, -40]} segments={40} bounds={[60, 3, 30]} volume={40} color={color} opacity={1} fade={200} speed={0.03} />
    </Clouds>
  );
}

const haloTexture = (() => {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,220,160,0.75)");
  grad.addColorStop(0.25, "rgba(255,206,140,0.35)");
  grad.addColorStop(1, "rgba(255,206,140,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

/** 길가 정원 등(실종자 한 명): 땅에 세워져 길을 밝힘 (띄워 보내지 않음) */
function Lantern({
  position,
  onSelect,
  lamp,
  home,
}: {
  position: [number, number, number];
  onSelect: () => void;
  lamp: number;
  /** 집으로 가는 길이 완성되면 등불 빛무리가 커짐 */
  home: boolean;
}) {
  const [hover, setHover] = useState(false);
  const body = useRef<THREE.Group>(null);

  useFrame(() => {
    body.current?.scale.setScalar(hover ? 1.15 : 1);
  });

  useEffect(() => {
    document.body.style.cursor = hover ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover]);

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      <group ref={body} position={[0, 1.1, 0]}>
        {/* 정원 등: 기둥 + 작은 지붕 + 빛나는 등 */}
        <mesh position={[0, -0.8, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 1.6, 8]} />
          <meshStandardMaterial color={POST} />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <coneGeometry args={[0.32, 0.22, 4]} />
          <meshStandardMaterial color={POST} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.32, 0.38, 0.32]} />
          <meshStandardMaterial color={LAMP} emissive={LAMP} emissiveIntensity={lamp} toneMapped={false} />
        </mesh>
        {haloTexture && (
          <Billboard>
            <mesh>
              <planeGeometry args={home ? [2.6, 2.6] : [1.6, 1.6]} />
              <meshBasicMaterial map={haloTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </mesh>
          </Billboard>
        )}
      </group>
    </group>
  );
}

/**
 * 응원 구름: 한 조각 = 징검다리 옆에 붙는 작은 구름 하나. 위로 떠오르지 않고 길에 합류만 함
 * 황금비 간격으로 길 전체에 고르게 퍼뜨림 → 많이 모일수록 길이 두툼해짐. InstancedMesh 1개, 최대 240개
 */
function PathClouds({ curve, count, golden }: { curve: THREE.CatmullRomCurve3; count: number; golden: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const MAX = 240;
  const n = Math.min(MAX, count);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let k = 0; k < n; k++) {
      const u = (k * 0.6180339887) % 1;
      const c = curve.getPoint(u);
      const t = curve.getTangent(u);
      const side = k % 2 === 0 ? 1 : -1;
      const off = side * (1.0 + ((k * 13) % 7) / 20);
      const size = 0.18 + ((k * 29) % 10) / 100;
      p.set(c.x - t.z * off, c.y - 0.4 + size * 0.5, c.z + t.x * off);
      s.set(size * 1.4, size, size * 1.1);
      m.compose(p, q, s);
      mesh.setMatrixAt(k, m);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }, [curve, n]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX]} frustumCulled={false}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive={golden ? "#ffe2a8" : "#fff4e8"}
        emissiveIntensity={golden ? 0.7 : 0.5}
        roughness={1}
      />
    </instancedMesh>
  );
}

/** 구름 10조각 이상: 각 지역 길머리에 위에서 내려오는 은은한 햇살 */
function SunShaft({ golden }: { golden: boolean }) {
  return (
    <mesh position={[0, 3.2, 0]}>
      <cylinderGeometry args={[0.35, 1.1, 7.4, 24, 1, true]} />
      <meshBasicMaterial
        color={golden ? "#ffe0a0" : "#fff3d6"}
        transparent
        opacity={golden ? 0.2 : 0.12}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
