"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Weather } from "@/lib/weather/types";
import { Atmosphere, LighthouseBeam } from "./ExpoAtmosphere";
import { ExpoWeather } from "./ExpoWeather";
import type { GardenPhase } from "./expo-environment";

/** 1인칭 둘러보기 정원: 캐릭터 없이 내가 언덕 위 정원에 서 있고, 드래그(관성)로 좌우를 둘러봄 */

/** 풍차 언덕과 등대 언덕 */
const WIND_HILL = { x: -15, z: -36 };
const LIGHT_HILL = { x: 40, z: -62 };
const EYE = 4.4;
const BASE_PITCH = -0.04; // 살짝 올려다봐 하늘과 구름이 보이게
const MAX_YAW = 0.8; // 좌우 약 ±46°
const MAX_PITCH = 0.16;
const GATE_Z = 30;
const FIELD_Z = 36; // 비탈이 시작되는 자리
const START_Z = 54;

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
  return Math.sin(z * 0.06) * 6;
}

/** 완만한 언덕 높이 (멀수록 높아져 가장자리가 능선처럼 보임) */
function height(x: number, z: number) {
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
  { name: "아이들의 길", color: "#f1c85b", c: { x: -27, z: 4 }, l: { x: -13, z: 10 } },
  { name: "어른들의 길", color: "#d98d66", c: { x: -31, z: -36 }, l: WIND_HILL },
  { name: "오래 기다리는 길", color: "#8b9f91", c: { x: 30, z: -50 }, l: LIGHT_HILL },
  { name: "바다 건너 길", color: "#77a8bf", c: { x: 37, z: -12 }, l: { x: 22, z: -6 } },
];

function yawToward(from: Pt, to: Pt) {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}
function makeView(name: string, z: number, look: Pt) {
  const pos = { x: pathX(z), z };
  return { name, ...pos, yaw: yawToward(pos, look) };
}
/** 이동점: 입구 → 아이들 → 바다 건너 → 어른들 → 오래 기다리는 (길을 따라 안쪽으로) */
const VIEWS = [
  makeView("입구", START_Z, { x: pathX(GATE_Z), z: GATE_Z - 2 }),
  makeView("아이들의 길", 24, { x: -22, z: 4 }),
  makeView("바다 건너 길", 14, { x: 26, z: -8 }),
  makeView("어른들의 길", 2, { x: -24, z: -34 }),
  makeView("오래 기다리는 길", -28, { x: 36, z: -56 }),
];

/** 세로 화면(폰)에서는 시야를 넓혀 풍차·등대·바람개비가 잘리지 않게 */
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
function DragLook({ paused, reducedMotion, view }: { paused: boolean; reducedMotion: boolean; view: number }) {
  const { gl } = useThree();
  const state = useRef({ yaw: 0, pitch: 0, vyaw: 0, vpitch: 0, drag: false, x: 0, y: 0 });
  const rig = useRef({ x: VIEWS[0].x, z: VIEWS[0].z, yaw: VIEWS[0].yaw });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
    state.current.yaw = 0;
    state.current.vyaw = 0;
  }, [view]);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (paused) return;
      state.current.drag = true;
      state.current.x = e.clientX;
      state.current.y = e.clientY;
      state.current.vyaw = 0;
      state.current.vpitch = 0;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!state.current.drag) return;
      const k = 0.0042; // 화면 폭 한 번 드래그 ≈ 시야 전체
      const dx = e.clientX - state.current.x;
      const dy = e.clientY - state.current.y;
      state.current.x = e.clientX;
      state.current.y = e.clientY;
      state.current.yaw = THREE.MathUtils.clamp(state.current.yaw + dx * k, -MAX_YAW, MAX_YAW);
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
  }, [gl, paused]);

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!state.current.drag) {
      const decay = Math.exp(-dt * 3.2);
      state.current.vyaw *= decay;
      state.current.vpitch *= decay;
      state.current.yaw = THREE.MathUtils.clamp(state.current.yaw + state.current.vyaw * dt, -MAX_YAW, MAX_YAW);
      state.current.pitch = THREE.MathUtils.clamp(state.current.pitch + state.current.vpitch * dt, -MAX_PITCH, MAX_PITCH);
      if (Math.abs(state.current.yaw) >= MAX_YAW) state.current.vyaw = 0;
    }
    const v = VIEWS[viewRef.current] ?? VIEWS[0];
    const a = reducedMotion ? 1 : 1 - Math.exp(-dt * 1.9);
    rig.current.x += (v.x - rig.current.x) * a;
    rig.current.z += (v.z - rig.current.z) * a;
    const dy = Math.atan2(Math.sin(v.yaw - rig.current.yaw), Math.cos(v.yaw - rig.current.yaw));
    rig.current.yaw += dy * a;
    const t = performance.now() / 1000;
    const sway = reducedMotion ? 0 : Math.sin(t * 0.5) * 0.004;
    camera.position.set(rig.current.x, height(rig.current.x, rig.current.z) + EYE + (reducedMotion ? 0 : Math.sin(t * 0.9) * 0.02), rig.current.z);
    camera.rotation.order = "YXZ";
    camera.rotation.set(BASE_PITCH - state.current.pitch * 0.6 + sway, rig.current.yaw - state.current.yaw, 0);
  });
  return null;
}

/** 언덕·들판. 정점 색으로 풀빛에 변화를 주고, 풀잎·들꽃을 인스턴스로 뿌림 */
function Field({ phase, still }: { phase: GardenPhase; still: boolean }) {
  const dot = useSoftDot();
  const grass = useRef<THREE.InstancedMesh>(null);
  const wind = useRef({ value: 0 });
  const ground = useMemo(() => {
    const g = new THREE.PlaneGeometry(320, 260, 150, 120);
    g.rotateX(-Math.PI / 2);
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const a = new THREE.Color("#8fb54a");
    const b = new THREE.Color("#c4d25e");
    const c = new THREE.Color("#a3bf4f");
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) - 50;
      pos.setXYZ(i, x, height(x, z), z);
      const n = (Math.sin(x * 0.21) + Math.cos(z * 0.17) + Math.sin((x + z) * 0.09)) / 3;
      tmp.copy(a).lerp(n > 0 ? b : c, Math.abs(n));
      // 볕을 받는 언덕 위쪽일수록 노란빛
      tmp.lerp(b, THREE.MathUtils.clamp(pos.getY(i) / 14, 0, 0.7));
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  const bladeGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([-0.035, 0, 0, 0.035, 0, 0, 0.01, 0.6, 0], 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const bladeMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: "#a9c25a", roughness: 1, side: THREE.DoubleSide });
    m.onBeforeCompile = shader => {
      shader.uniforms.lookWind = wind.current;
      shader.vertexShader = "uniform float lookWind;\n" + shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x += sin(lookWind + instanceMatrix[3].x * .3 + instanceMatrix[3].z * .2) * position.y * .18;",
      );
    };
    return m;
  }, []);

  const COUNT = 9000;
  useEffect(() => {
    const mesh = grass.current;
    if (!mesh) return;
    const r = rng(11);
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      const x = (r() - 0.5) * 120;
      const z = 30 - r() * 100;
      // 가운데 오솔길은 비워 둠
      if (Math.abs(x - pathX(z)) < 1.6 && z > -40) {
        d.scale.setScalar(0.001);
      } else {
        d.position.set(x, height(x, z - 40 + 40), z);
        d.rotation.set(0, r() * 6.28, 0);
        d.scale.setScalar(0.8 + r() * 1.0);
      }
      d.position.set(d.scale.x < 0.01 ? 0 : x, d.scale.x < 0.01 ? -50 : height(x, z), z);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      col.setHSL(0.19 + r() * 0.06, 0.5 + r() * 0.15, 0.42 + r() * 0.18);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  // 들꽃: 앞쪽(내 가까이)일수록 빽빽하고 크게, 멀수록 색 점으로
  const flowers = useMemo(() => {
    const r = rng(29);
    const count = 2600;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = ["#ffffff", "#ff8fa8", "#ffd84d", "#c9b3f2", "#ff7a4d", "#fff3c4", "#f5a3c7"].map(c => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      const near = r() < 0.55;
      const x = near ? (r() - 0.5) * 34 : (r() - 0.5) * 120;
      const z = near ? START_Z - 6 - r() * 22 : START_Z - r() * 120;
      pos.set([x, height(x, z) + 0.3, z], i * 3);
      const c = palette[i % palette.length];
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  useEffect(() => () => { ground.dispose(); bladeGeometry.dispose(); bladeMaterial.dispose(); flowers.dispose(); }, [ground, bladeGeometry, bladeMaterial, flowers]);
  useFrame((state, dt) => {
    if (!still) wind.current.value += Math.min(dt, 0.05) * 1.3;
    void state;
  });

  const night = phase === "night";
  return (
    <group>
      <mesh geometry={ground} receiveShadow raycast={() => null}>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      <instancedMesh ref={grass} args={[bladeGeometry, bladeMaterial, COUNT]} frustumCulled={false} raycast={() => null} />
      <points geometry={flowers} raycast={() => null}>
        <pointsMaterial size={0.7} sizeAttenuation vertexColors map={dot} alphaTest={0.45} transparent opacity={night ? 0.6 : 1} depthWrite={false} />
      </points>
    </group>
  );
}

/** 능선 위의 나무들 (원경). 등대·풍차 대신 조용한 나무 실루엣 */
function Trees() {
  const { geo, material } = useMemo(() => {
    const r = rng(5);
    const trunk = new THREE.CylinderGeometry(0.1, 0.16, 1.6, 6);
    const crown = new THREE.SphereGeometry(1, 14, 10);
    const items: { x: number; z: number; s: number; tone: number }[] = [];
    // 멀리 언덕 가장자리에 작고 둥근 나무만 몇 그루
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (36 + r() * 30);
      const z = -20 - r() * 70;
      items.push({ x, z, s: 1.1 + r() * 0.8, tone: r() });
    }
    const crowns = ["#86ad55", "#98b95c", "#7aa04f"].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
    return { geo: { trunk, crown, items }, material: { trunk: new THREE.MeshStandardMaterial({ color: "#7a5a3c", roughness: 1 }), crowns } };
  }, []);
  useEffect(() => () => { geo.trunk.dispose(); geo.crown.dispose(); material.trunk.dispose(); material.crowns.forEach(m => m.dispose()); }, [geo, material]);
  return (
    <group>
      {geo.items.map((t, i) => (
        <group key={i} position={[t.x, height(t.x, t.z), t.z]} scale={t.s}>
          <mesh geometry={geo.trunk} material={material.trunk} position={[0, 0.8, 0]} raycast={() => null} />
          <mesh geometry={geo.crown} material={material.crowns[Math.floor(t.tone * 3) % 3]} position={[0, 2.4, 0]} scale={[1.5, 1.25, 1.5]} raycast={() => null} />
        </group>
      ))}
    </group>
  );
}

/** 잔잔하게 흐르는 옅은 바람결 선 */
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

/** 낮엔 햇빛 먼지, 밤엔 아주 은은한 반딧불이 몇 점 */
function Motes({ phase, still }: { phase: GardenPhase; still: boolean }) {
  const dot = useSoftDot();
  const points = useRef<THREE.Points>(null);
  const night = phase === "night";
  const count = night ? 40 : 120;
  const data = useMemo(() => {
    const r = rng(night ? 3 : 9);
    const base = new Float32Array(count * 3);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      base.set([(r() - 0.5) * 70, 1 + r() * (night ? 5 : 9), START_Z - 8 - r() * 80], i * 3);
    }
    pos.set(base);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    return { base, pos, g };
  }, [count, night]);
  useEffect(() => () => { data.g.dispose(); dot.dispose(); }, [data, dot]);
  useFrame(() => {
    if (still) return;
    const t = performance.now() / 1000;
    const attr = data.g.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const j = i * 3;
      const k = i * 1.7;
      arr[j] = data.base[j] + Math.sin(t * (night ? 0.35 : 0.12) + k) * (night ? 1.2 : 0.6);
      arr[j + 1] = data.base[j + 1] + Math.sin(t * (night ? 0.5 : 0.18) + k * 1.3) * (night ? 0.5 : 0.3);
      arr[j + 2] = data.base[j + 2] + Math.cos(t * 0.2 + k) * 0.8;
    }
    attr.needsUpdate = true;
    const mat = points.current?.material as THREE.PointsMaterial | undefined;
    // 반딧불이는 천천히 깜빡임
    if (mat && night) mat.opacity = 0.55 + Math.sin(t * 1.4) * 0.25;
  });
  return (
    <points ref={points} geometry={data.g} frustumCulled={false} raycast={() => null}>
      <pointsMaterial
        map={dot}
        color={night ? "#e6f59a" : "#fff3c4"}
        size={night ? 0.9 : 0.4}
        sizeAttenuation
        transparent
        opacity={night ? 0.7 : 0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** 큼직한 뭉게구름: 부드러운 점 여러 장을 뭉쳐 놓고 아주 천천히 흘려보냄 */
function Clouds({ phase, still }: { phase: GardenPhase; still: boolean }) {
  const dot = useSoftDot();
  const group = useRef<THREE.Group>(null);
  const clusters = useMemo(() => {
    const r = rng(612);
    return Array.from({ length: 9 }, () => {
      const cx = (r() - 0.5) * 520;
      const cy = 55 + r() * 70;
      const cz = -260 - r() * 160;
      const puffs = Array.from({ length: 9 }, () => ({
        x: (r() - 0.5) * 60,
        y: (r() - 0.35) * 14,
        z: (r() - 0.5) * 20,
        s: 34 + r() * 36,
        shade: r(),
      }));
      return { cx, cy, cz, puffs };
    });
  }, []);
  const tint = phase === "night" ? "#6c7ea3" : phase === "sunset" ? "#ffd2b0" : phase === "morning" ? "#fff0e4" : "#ffffff";
  const shadeTint = phase === "night" ? "#3c4a6b" : phase === "sunset" ? "#c98d8c" : "#cfdcec";
  useEffect(() => () => dot.dispose(), [dot]);
  useFrame((_, delta) => {
    if (still || !group.current) return;
    group.current.position.x += Math.min(delta, 0.05) * 1.2;
    if (group.current.position.x > 260) group.current.position.x = -260;
  });
  return (
    <group ref={group}>
      {clusters.map((c, i) => (
        <group key={i} position={[c.cx, c.cy, c.cz]}>
          {c.puffs.map((p, k) => (
            <sprite key={k} position={[p.x, p.y, p.z]} scale={[p.s, p.s * 0.62, 1]} raycast={() => null}>
              <spriteMaterial map={dot} color={p.shade > 0.6 ? shadeTint : tint} transparent opacity={phase === "night" ? 0.35 : 0.8} depthWrite={false} fog={false} />
            </sprite>
          ))}
        </group>
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
        f.y = 38 + Math.random() * 25;
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
  return (
    <group ref={group} visible={false}>
      {/* 기체: 진행 방향(+x)으로 길쭉하게, 날개는 옆으로 */}
      <mesh raycast={() => null}>
        <boxGeometry args={[9, 0.55, 0.55]} />
        <meshBasicMaterial color={night ? "#0e1424" : "#f4f6f8"} fog={false} />
      </mesh>
      <mesh position={[0.5, 0, 0]} raycast={() => null}>
        <boxGeometry args={[1.6, 0.1, 9]} />
        <meshBasicMaterial color={night ? "#0e1424" : "#e4e8ec"} fog={false} />
      </mesh>
      <mesh position={[-3.8, 0.7, 0]} raycast={() => null}>
        <boxGeometry args={[1, 1.4, 0.1]} />
        <meshBasicMaterial color={night ? "#0e1424" : "#e4e8ec"} fog={false} />
      </mesh>
      <mesh ref={strobe} position={[0, 0.5, 0]} raycast={() => null}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#fff6e0" transparent fog={false} />
      </mesh>
      <mesh position={[0.5, 0, 4.4]} raycast={() => null}>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshBasicMaterial color="#ff5a4f" fog={false} />
      </mesh>
      <mesh position={[0.5, 0, -4.4]} raycast={() => null}>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshBasicMaterial color="#59e08a" fog={false} />
      </mesh>
      {!night && (
        <mesh position={[-34, 0, 0]} rotation={[0, 0, Math.PI / 2]} raycast={() => null}>
          <cylinderGeometry args={[0.18, 0.9, 60, 6, 1, true]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.28} depthWrite={false} fog={false} />
        </mesh>
      )}
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
function Path() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(3.2, 120, 2, 90);
    g.rotateX(-Math.PI / 2);
    const pos = g.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i) - 8;
      const x = pos.getX(i) + pathX(z);
      pos.setXYZ(i, x, height(x, z) + 0.04, z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} raycast={() => null}>
      <meshStandardMaterial color="#cdb998" roughness={1} />
    </mesh>
  );
}

/** 사진 속 같은 따뜻한 나무 풍차: 위로 갈수록 좁은 몸통, 원뿔 지붕, 격자 날개 네 장 */
function Windmill({ still }: { still: boolean }) {
  const sails = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (!still && sails.current) sails.current.rotation.z -= Math.min(delta, 0.05) * 0.35;
  });
  const wood = "#8a5a36";
  const woodDark = "#6b4326";
  return (
    <group>
      <mesh position={[0, 4.2, 0]} raycast={() => null}>
        <cylinderGeometry args={[1.9, 3.0, 8.4, 8]} />
        <meshStandardMaterial color={wood} roughness={0.95} flatShading />
      </mesh>
      {/* 널빤지 띠 */}
      {[1.6, 4.0, 6.4].map(y => (
        <mesh key={y} position={[0, y, 0]} raycast={() => null}>
          <cylinderGeometry args={[2.62 - y * 0.16, 2.72 - y * 0.16, 0.14, 8]} />
          <meshStandardMaterial color={woodDark} roughness={1} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 9.7, 0]} raycast={() => null}>
        <coneGeometry args={[2.5, 2.8, 8]} />
        <meshStandardMaterial color="#5a3b24" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 1.1, 2.95]} raycast={() => null}>
        <boxGeometry args={[1.1, 2.1, 0.2]} />
        <meshStandardMaterial color="#3d2615" roughness={1} />
      </mesh>
      {/* 날개: 가운데 축에 네 장, 각 장은 살대 + 가로살로 격자 */}
      <group position={[0, 8.6, 3.0]} ref={sails}>
        {[0, 1, 2, 3].map(i => (
          <group key={i} rotation={[0, 0, (i * Math.PI) / 2 + 0.5]}>
            <mesh position={[0, 3.6, 0]} raycast={() => null}>
              <boxGeometry args={[0.16, 7.2, 0.16]} />
              <meshStandardMaterial color={woodDark} roughness={1} />
            </mesh>
            <mesh position={[0.55, 4.4, 0]} raycast={() => null}>
              <boxGeometry args={[1.1, 5.4, 0.05]} />
              <meshStandardMaterial color="#e9d9b4" roughness={1} transparent opacity={0.55} side={THREE.DoubleSide} />
            </mesh>
            {[1.4, 2.4, 3.4, 4.4, 5.4, 6.4].map(y => (
              <mesh key={y} position={[0.55, y, 0]} raycast={() => null}>
                <boxGeometry args={[1.1, 0.07, 0.09]} />
                <meshStandardMaterial color={woodDark} roughness={1} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, 0, 0.2]} raycast={() => null}>
          <sphereGeometry args={[0.38, 10, 8]} />
          <meshStandardMaterial color="#3d2615" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

/** 흰 몸통에 빨간 띠를 두른 등대. 밤엔 꼭대기 불빛이 따뜻하게 켜지고 빛줄기가 천천히 돎 */
function Lighthouse({ phase, still }: { phase: GardenPhase; still: boolean }) {
  const night = phase === "night" || phase === "sunset";
  const bands = [0, 1, 2, 3];
  return (
    <group>
      {bands.map(i => {
        const y0 = i * 4.2;
        const r0 = 2.6 - i * 0.28;
        const r1 = 2.6 - (i + 1) * 0.28;
        return (
          <mesh key={i} position={[0, y0 + 2.1, 0]} raycast={() => null}>
            <cylinderGeometry args={[r1, r0, 4.2, 14]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#f6efe2" : "#d9503f"} roughness={0.9} />
          </mesh>
        );
      })}
      <mesh position={[0, 16.9, 0]} raycast={() => null}>
        <cylinderGeometry args={[2.1, 1.7, 0.4, 14]} />
        <meshStandardMaterial color="#3b3a3a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 18.1, 0]} raycast={() => null}>
        <cylinderGeometry args={[1.1, 1.2, 2.0, 12]} />
        <meshStandardMaterial color={night ? "#ffe2a0" : "#e8f1f4"} emissive={night ? "#ffcf70" : "#000000"} emissiveIntensity={night ? 1.4 : 0} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 19.8, 0]} raycast={() => null}>
        <coneGeometry args={[1.6, 1.8, 12]} />
        <meshStandardMaterial color="#d9503f" roughness={0.9} />
      </mesh>
      <group position={[0, 18.1 - 4.9 * 0.5, 0]} scale={0.5}>
        <LighthouseBeam night={phase === "night"} reducedMotion={still} />
      </group>
    </group>
  );
}

const WOOD = "#9a6a42";
const WOOD_DARK = "#6e4a2c";
const FONT = '"Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif';

/** 글자를 그려 나무 팻말 판에 붙임 */
function useSignTexture(text: string, sub: string, bg: string) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 320;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 320);
    ctx.strokeStyle = "rgba(90,58,30,.6)";
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 1004, 300);
    ctx.fillStyle = "#3a2714";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = sub ? 112 : 128;
    ctx.font = `700 ${size}px ${FONT}`;
    while (ctx.measureText(text).width > 900 && size > 40) {
      size -= 6;
      ctx.font = `700 ${size}px ${FONT}`;
    }
    ctx.fillText(text, 512, sub ? 120 : 165);
    if (sub) {
      ctx.font = `500 54px ${FONT}`;
      ctx.fillStyle = "#5a4128";
      ctx.fillText(sub, 512, 240);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [text, sub, bg]);
}

/** 이야기를 알려 주는 팻말 (보는 쪽을 향함) */
function Sign({ at, face, text, sub = "", color, scale = 1 }: { at: Pt; face: number; text: string; sub?: string; color: string; scale?: number }) {
  const tex = useSignTexture(text, sub, color);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group position={[at.x, height(at.x, at.z), at.z]} rotation={[0, face, 0]} scale={scale}>
      {[-1.45, 1.45].map(x => (
        <mesh key={x} position={[x, 1.4, -0.05]} raycast={() => null}>
          <boxGeometry args={[0.16, 2.8, 0.16]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 2.25, -0.06]} raycast={() => null}>
        <boxGeometry args={[3.5, 1.15, 0.1]} />
        <meshStandardMaterial color={WOOD} roughness={1} />
      </mesh>
      <mesh position={[0, 2.25, 0.0]} raycast={() => null}>
        <planeGeometry args={[3.3, 1.02]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
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
  const tex = useSignTexture("실종자들의 정원", "천천히 걸으며 기억해 주세요", "#f4e3bf");
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <group>
      <group position={[cx, y, GATE_Z]}>
        {[-4, 4].map(x => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 3, 0]} raycast={() => null}>
              <boxGeometry args={[0.55, 6, 0.55]} />
              <meshStandardMaterial color={WOOD} roughness={1} />
            </mesh>
            <mesh position={[0, 6.15, 0]} raycast={() => null}>
              <boxGeometry args={[0.85, 0.3, 0.85]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={1} />
            </mesh>
            <MiniPinwheel at={[0, 7.1, 0.1]} color={x < 0 ? "#ff8a65" : "#6fd0c0"} scale={1.5} still={still} />
          </group>
        ))}
        <mesh position={[0, 5.7, 0]} raycast={() => null}>
          <boxGeometry args={[9.4, 0.45, 0.7]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={1} />
        </mesh>
        <mesh position={[0, 6.35, 0]} rotation={[0, 0, 0]} raycast={() => null}>
          <boxGeometry args={[10.2, 0.28, 1.5]} />
          <meshStandardMaterial color="#b4543a" roughness={0.95} />
        </mesh>
        {/* 걸린 팻말 */}
        <mesh position={[0, 4.35, 0.02]} raycast={() => null}>
          <boxGeometry args={[6.3, 1.7, 0.12]} />
          <meshStandardMaterial color={WOOD} roughness={1} />
        </mesh>
        <mesh position={[0, 4.35, 0.09]} raycast={() => null}>
          <planeGeometry args={[6.0, 1.5]} />
          <meshStandardMaterial map={tex} roughness={0.9} />
        </mesh>
        {[-2.4, 2.4].map(x => (
          <mesh key={x} position={[x, 5.3, 0.02]} raycast={() => null}>
            <cylinderGeometry args={[0.035, 0.035, 0.6, 5]} />
            <meshStandardMaterial color={WOOD_DARK} />
          </mesh>
        ))}
        {/* 문 양옆 등 */}
        {[-3.5, 3.5].map(x => (
          <sprite key={x} position={[x, 4.9, 0.5]} scale={[night ? 3.2 : 0.01, night ? 3.2 : 0.01, 1]} raycast={() => null}>
            <spriteMaterial map={dot} color="#ffd58a" transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
          </sprite>
        ))}
      </group>
      {/* 낮은 울타리 */}
      {[-1, 1].map(side =>
        [0, 1, 2, 3, 4, 5].map(i => {
          const x = cx + side * (5.2 + i * 1.5);
          return (
            <group key={`${side}${i}`} position={[x, height(x, GATE_Z), GATE_Z]}>
              <mesh position={[0, 0.55, 0]} raycast={() => null}>
                <boxGeometry args={[0.14, 1.1, 0.14]} />
                <meshStandardMaterial color={WOOD} roughness={1} />
              </mesh>
              <mesh position={[side * -0.75, 0.85, 0]} raycast={() => null}>
                <boxGeometry args={[1.5, 0.1, 0.07]} />
                <meshStandardMaterial color={WOOD_DARK} roughness={1} />
              </mesh>
              <mesh position={[side * -0.75, 0.45, 0]} raycast={() => null}>
                <boxGeometry args={[1.5, 0.1, 0.07]} />
                <meshStandardMaterial color={WOOD_DARK} roughness={1} />
              </mesh>
            </group>
          );
        }),
      )}
    </group>
  );
}

/** 길가 가로등: 밤엔 따뜻하게 빛남 */
function LampPost({ at, night, dot }: { at: Pt; night: boolean; dot: THREE.Texture }) {
  return (
    <group position={[at.x, height(at.x, at.z), at.z]}>
      <mesh position={[0, 1.6, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.06, 0.09, 3.2, 8]} />
        <meshStandardMaterial color="#4b3a2c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.35, 0]} raycast={() => null}>
        <sphereGeometry args={[0.26, 12, 10]} />
        <meshStandardMaterial color="#ffe6b0" emissive="#ffc766" emissiveIntensity={night ? 2.4 : 0.15} />
      </mesh>
      <mesh position={[0, 3.7, 0]} raycast={() => null}>
        <coneGeometry args={[0.34, 0.26, 10]} />
        <meshStandardMaterial color="#4b3a2c" roughness={0.9} />
      </mesh>
      <sprite position={[0, 3.35, 0]} scale={[night ? 3.4 : 0.01, night ? 3.4 : 0.01, 1]} raycast={() => null}>
        <spriteMaterial map={dot} color="#ffd18a" transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
    </group>
  );
}

/** 쉬어 가는 벤치 (길 쪽을 향함) */
function Bench({ at, face }: { at: Pt; face: number }) {
  return (
    <group position={[at.x, height(at.x, at.z), at.z]} rotation={[0, face, 0]}>
      <mesh position={[0, 0.5, 0]} raycast={() => null}>
        <boxGeometry args={[2, 0.12, 0.6]} />
        <meshStandardMaterial color={WOOD} roughness={1} />
      </mesh>
      <mesh position={[0, 0.95, -0.27]} rotation={[-0.12, 0, 0]} raycast={() => null}>
        <boxGeometry args={[2, 0.5, 0.08]} />
        <meshStandardMaterial color={WOOD} roughness={1} />
      </mesh>
      {[-0.85, 0.85].map(x => (
        <mesh key={x} position={[x, 0.25, 0]} raycast={() => null}>
          <boxGeometry args={[0.1, 0.5, 0.5]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** 아이들의 길: 무지개 아치와 양쪽 작은 바람개비 */
function RainbowArch({ still }: { still: boolean }) {
  const colors = ["#ff8a65", "#ffd166", "#6fd0c0", "#74b6ff"];
  return (
    <group>
      {colors.map((c, i) => (
        <mesh key={c} position={[0, 0.2, 0]} raycast={() => null}>
          <torusGeometry args={[3.9 - i * 0.42, 0.17, 8, 36, Math.PI]} />
          <meshStandardMaterial color={c} roughness={0.7} />
        </mesh>
      ))}
      {[-3.9, 3.9].map((x, i) => (
        <MiniPinwheel key={x} at={[x, 1.1, 0.2]} color={i ? "#ffd166" : "#ff7aa8"} scale={1.25} still={still} />
      ))}
      <mesh position={[0, 0.06, 0]} raycast={() => null}>
        <cylinderGeometry args={[4.6, 4.9, 0.14, 24]} />
        <meshStandardMaterial color="#e9d8a8" roughness={1} />
      </mesh>
    </group>
  );
}

/** 바다 건너 길: 받침대 위 지구본 */
function Globe({ still }: { still: boolean }) {
  const spin = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!still && spin.current) spin.current.rotation.y += Math.min(dt, 0.05) * 0.25;
  });
  return (
    <group>
      <mesh position={[0, 0.5, 0]} raycast={() => null}>
        <cylinderGeometry args={[1.5, 1.9, 1, 14]} />
        <meshStandardMaterial color="#d8c9a8" roughness={1} />
      </mesh>
      <group position={[0, 3.2, 0]} rotation={[0, 0, 0.4]}>
        <group ref={spin}>
          <mesh raycast={() => null}>
            <sphereGeometry args={[1.75, 24, 18]} />
            <meshStandardMaterial color="#79b9de" roughness={0.7} />
          </mesh>
          {[[0.6, 0.9, 0.9, 0.9], [-0.9, 0.2, 1.3, 0.6], [0.2, -0.9, 1.4, 0.7], [-0.4, 1.4, 0.5, 0.5]].map(([a, b, c, d], i) => (
            <mesh key={i} position={[Math.sin(a) * 1.58, Math.sin(b) * 1.2, Math.cos(a) * 1.58 * Math.cos(c * 0.3)]} scale={d} raycast={() => null}>
              <icosahedronGeometry args={[0.55, 0]} />
              <meshStandardMaterial color="#8fbf6a" roughness={1} flatShading />
            </mesh>
          ))}
        </group>
        <mesh rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
          <torusGeometry args={[2.05, 0.05, 8, 40]} />
          <meshStandardMaterial color="#d9b25b" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh raycast={() => null}>
          <torusGeometry args={[2.05, 0.05, 8, 40]} />
          <meshStandardMaterial color="#d9b25b" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

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
function Trail({ from, to }: { from: Pt; to: Pt }) {
  const geo = useMemo(() => {
    const segs = 18;
    const w = 1.1;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const cx = from.x + dx * t + Math.sin(t * Math.PI * 2) * 1.2 * nx;
      const cz = from.z + dz * t + Math.sin(t * Math.PI * 2) * 1.2 * nz;
      const ww = w * (1 - t * 0.35);
      for (const side of [-1, 1]) {
        const x = cx + nx * ww * side;
        const z = cz + nz * ww * side;
        pos.push(x, height(x, z) + 0.05, z);
      }
      if (i < segs) {
        const k = i * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [from, to]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} raycast={() => null}>
      <meshStandardMaterial color="#d2bf94" roughness={1} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** 이동점: 바닥의 빛나는 고리와 떠 있는 표식. 누르면 그 구역으로 걸어감 */
function Hotspots({ view, onView, still }: { view: number; onView: (i: number) => void; still: boolean }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    if (still) return;
    const t = performance.now() / 1000;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const k = 1 + Math.sin(t * 2 + i) * 0.06;
      g.scale.set(k, k, k);
      g.children[2].position.y = 3.3 + Math.sin(t * 1.6 + i) * 0.22;
      g.children[2].rotation.y = t * 0.8;
    });
  });
  return (
    <group>
      {VIEWS.map((v, i) => {
        if (i === view || i === 0) return null;
        const zoneIdx = [-1, 0, 3, 1, 2][i];
        const color = ZONES[zoneIdx]?.color ?? "#fff0c4";
        return (
          <group key={v.name} position={[v.x, height(v.x, v.z), v.z]} ref={el => { refs.current[i] = el; }}>
            <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
              <ringGeometry args={[1.05, 1.5, 32]} />
              <meshBasicMaterial color="#fff6d8" transparent opacity={0.92} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
              <circleGeometry args={[1.05, 32]} />
              <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
            </mesh>
            <mesh position={[0, 3.3, 0]} raycast={() => null}>
              <octahedronGeometry args={[0.42, 0]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <mesh
              position={[0, 1.6, 0]}
              onClick={e => { e.stopPropagation(); if (e.delta <= 6) onView(i); }}
              onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { document.body.style.cursor = ""; }}
            >
              <cylinderGeometry args={[2.1, 2.1, 3.6, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** 전시 공간 전체: 입구, 길, 구역 조형물과 팻말, 광장, 벤치, 가로등 */
function Scenery({ phase, still, view, onView }: { phase: GardenPhase; still: boolean; view: number; onView: (i: number) => void }) {
  const dot = useSoftDot();
  useEffect(() => () => dot.dispose(), [dot]);
  const night = phase === "night" || phase === "sunset";
  const W = ZONES[1].l;
  const L = ZONES[2].l;
  const A = ZONES[0].l;
  const G = ZONES[3].l;
  // 팻말: 조형물 바로 앞쪽, 길에서 보이도록 옆으로 비껴 세워 이동점을 향하게 함
  const signAt = [0, 3, 1, 2].map((zone, k) => {
    const viewIdx = [1, 2, 3, 4][k];
    const v = VIEWS[viewIdx];
    const l = ZONES[zone].l;
    const dx = l.x - v.x;
    const dz = l.z - v.z;
    const len = Math.hypot(dx, dz) || 1;
    // 조형물에서 이동점 쪽으로 9, 옆으로 7 (길에서 먼 쪽)
    const side = l.x > v.x ? 1 : -1;
    return { zone, viewIdx, at: { x: l.x - (dx / len) * 9 + (-dz / len) * 7 * side * -1, z: l.z - (dz / len) * 9 + (dx / len) * 7 * side * -1 } };
  });
  return (
    <group>
      <Gate night={night} still={still} dot={dot} />
      {/* 샛길 */}
      <Trail from={{ x: pathX(20), z: 20 }} to={A} />
      <Trail from={{ x: pathX(10), z: 10 }} to={G} />
      <Trail from={{ x: pathX(-12), z: -12 }} to={{ x: W.x + 4, z: W.z + 6 }} />
      <Trail from={{ x: pathX(-28), z: -28 }} to={{ x: L.x - 6, z: L.z + 8 }} />
      {/* 구역 조형물 */}
      <group position={[A.x, height(A.x, A.z), A.z]} rotation={[0, Math.atan2(VIEWS[1].x - A.x, VIEWS[1].z - A.z), 0]}><RainbowArch still={still} /></group>
      <group position={[G.x, height(G.x, G.z) - 0.2, G.z]}><Globe still={still} /></group>
      <group position={[W.x, height(W.x, W.z) - 0.3, W.z]} rotation={[0, 0.5, 0]} scale={1.15}><Windmill still={still} /></group>
      <group position={[L.x, height(L.x, L.z) - 0.3, L.z]} scale={1.2}><Lighthouse phase={phase} still={still} /></group>
      {/* 광장 */}
      <group position={[8, height(8, -20), -20]}><PlazaPinwheel still={still} /></group>
      {/* 구역 팻말 */}
      {signAt.map(s => {
        const v = VIEWS[s.viewIdx];
        const face = Math.atan2(v.x - s.at.x, v.z - s.at.z);
        return <Sign key={s.zone} at={s.at} face={face} text={ZONES[s.zone].name} color="#f4e3bf" scale={1.5} />;
      })}
      {/* 벤치와 가로등 */}
      <Bench at={{ x: pathX(2) + 3.2, z: 2 }} face={-Math.PI / 2 + 0.1} />
      <Bench at={{ x: pathX(-6) - 3.2, z: -6 }} face={Math.PI / 2 - 0.1} />
      <Bench at={{ x: pathX(-22) + 3.4, z: -22 }} face={-Math.PI / 2} />
      {[40, 19, 7, -10, -17, -40].map((z, i) => (
        <LampPost key={z} at={{ x: pathX(z) + (i % 2 ? 3.4 : -3.4), z }} night={night} dot={dot} />
      ))}
      <Hotspots view={view} onView={onView} still={still} />
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
  ["#ff8a65", "#ffe0a3", "#ff8a65", "#ffe0a3"],
  ["#6fd0c0", "#fff3d6", "#6fd0c0", "#fff3d6"],
  ["#b79bf0", "#ffdbe8", "#b79bf0", "#ffdbe8"],
  ["#ffc145", "#fff7dc", "#ffc145", "#fff7dc"],
  ["#74b6ff", "#fff3e6", "#74b6ff", "#fff3e6"],
  ["#ff7aa8", "#ffe9b8", "#ff7aa8", "#ffe9b8"],
];

/** 실종자 한 분당 바람개비 하나. 누르면 사연 카드, 응원하면 한동안 세차게 돎 */
function Pinwheels({ people, boost, still, onSelect }: { people: LookPerson[]; boost: LookBoost | null; still: boolean; onSelect: (id: string) => void }) {
  const blade = getBlade();
  // 구역별 정돈: 실종자는 자기 구역 조형물 둘레에 해바라기 씨앗 배열로 고르게(서로 떨어지게), 길목과 조형물 자리는 비움
  const spots = useMemo(() => {
    const out: ({ x: number; y: number; z: number; scale: number } | undefined)[] = new Array(people.length);
    ZONES.forEach((zone, zi) => {
      const idx: number[] = [];
      people.forEach((p, i) => { if (p.garden === zi) idx.push(i); });
      const m = idx.length;
      if (!m) return;
      const r = rng(404 + zi * 31);
      const gap = m > 160 ? 3.0 : 3.7;
      const total = Math.ceil(m * 1.7);
      const R = gap * Math.sqrt(total / Math.PI);
      let placed = 0;
      for (let a = 0; a < total * 3 && placed < m; a++) {
        const rad = Math.sqrt(((a % total) + 0.5) / total) * R;
        const th = a * 2.399963;
        const x = zone.c.x + Math.cos(th) * rad * 1.25 + (r() - 0.5) * gap * 0.3;
        const z = zone.c.z + Math.sin(th) * rad + (r() - 0.5) * gap * 0.3;
        if (Math.abs(x - pathX(z)) < 2.6 && z < GATE_Z + 4) continue; // 길
        if (Math.hypot(x - zone.l.x, z - zone.l.z) < 7.5) continue; // 조형물 자리
        if (z > GATE_Z - 3 || Math.abs(x) > 90) continue; // 입구 앞
        if (VIEWS.some(v => Math.hypot(x - v.x, z - v.z) < 8)) continue; // 이동점 가까이는 비움
        const dist = Math.hypot(x - VIEWS[0].x, z - VIEWS[0].z);
        out[idx[placed]] = { x, z, y: height(x, z), scale: THREE.MathUtils.clamp(dist / 36, 0.8, 1.45) * (1 + r() * 0.15) };
        placed++;
      }
    });
    return out;
  }, [people]);

  const rotors = useRef<(THREE.Group | null)[]>([]);
  const boostRef = useRef<LookBoost | null>(boost);
  useEffect(() => { boostRef.current = boost; }, [boost]);
  const peopleRef = useRef(people);
  useEffect(() => { peopleRef.current = people; }, [people]);

  useFrame((_, delta) => {
    if (still) return;
    const dt = Math.min(delta, 0.05);
    const b = boostRef.current;
    const age = b ? (Date.now() - b.at) / 1000 : 99;
    peopleRef.current.forEach((p, i) => {
      const rotor = rotors.current[i];
      if (!rotor) return;
      // 응원 수가 많을수록 평소에도 조금 더 빨리 돎
      let speed = 0.55 + Math.min(p.lightCount ?? 0, 40) * 0.03;
      if (b && b.id === p.id && age < 9) speed += 9 * Math.exp(-age / 3.2);
      rotor.rotation.z -= speed * dt;
    });
  });

  return (
    <group>
      {people.map((p, i) => {
        const sp = spots[i];
        if (!sp) return null;
        const palette = PALETTES[i % PALETTES.length];
        return (
          <group key={p.id} position={[sp.x, sp.y, sp.z]} scale={sp.scale} >
            <mesh position={[0, 0.88, 0]} raycast={() => null}>
              <cylinderGeometry args={[0.025, 0.03, 1.76, 8]} />
              <meshStandardMaterial color="#b78c60" roughness={0.95} />
            </mesh>
            <group position={[0, 1.75, 0.05]} ref={el => { rotors.current[i] = el; }}>
              {palette.map((color, k) => (
                <mesh key={k} geometry={blade} rotation={[0, 0, (k * Math.PI) / 2]} raycast={() => null}>
                  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} roughness={0.8} side={THREE.DoubleSide} />
                </mesh>
              ))}
              <mesh position={[0, 0, 0.22]} raycast={() => null}>
                <sphereGeometry args={[0.07, 10, 8]} />
                <meshStandardMaterial color="#d6ae68" roughness={0.5} metalness={0.25} />
              </mesh>
            </group>
            {/* 눌리는 범위: 보이지 않는 큰 구 (손가락으로도 잘 눌리게) */}
            <mesh
              position={[0, 1.65, 0.1]}
              onClick={e => { e.stopPropagation(); if (e.delta <= 6) onSelect(p.id); }}
              onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
              onPointerOut={() => { document.body.style.cursor = ""; }}
            >
              <sphereGeometry args={[0.9, 10, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
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
  onReady?: () => void;
}

function Content({ phase, weather, reducedMotion, paused, december, people, boost, onSelect, view, onView, onReady }: LookSceneProps) {
  const player = useRef({ x: 0, z: 8 });
  useEffect(() => { onReady?.(); }, [onReady]);
  const still = reducedMotion || paused;
  const night = phase === "night";
  return (
    <>
      <ResponsiveFov />
      <DragLook paused={paused} reducedMotion={reducedMotion} view={view} />
      <Atmosphere phase={phase} overview={false} weather={weather?.kind} exponential />
      <Field phase={phase} still={still} />
      <Path />
      <Trees />
      <Scenery phase={phase} still={still} view={view} onView={onView} />
      <Pinwheels people={people} boost={boost} still={reducedMotion} onSelect={onSelect} />
      {!night && <WindStreaks still={still} />}
      <Motes phase={phase} still={still} />
      <Clouds phase={phase} still={still} />
      <Airplane phase={phase} still={still} />
      <ExpoWeather weather={weather} player={player} paused={still} />
      {december && <ChristmasTree still={still} />}
    </>
  );
}

function LookScene(props: LookSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows={false}
      camera={{ position: [VIEWS[0].x, height(VIEWS[0].x, VIEWS[0].z) + EYE, VIEWS[0].z], fov: 52, near: 0.5, far: 1200 }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ touchAction: "none" }}
    >
      <Content {...props} />
    </Canvas>
  );
}

export default memo(LookScene);
