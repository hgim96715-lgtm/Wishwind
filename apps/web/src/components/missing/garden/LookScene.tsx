"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Weather } from "@/lib/weather/types";
import { Atmosphere, LighthouseBeam } from "./ExpoAtmosphere";
import { ExpoWeather } from "./ExpoWeather";
import type { GardenPhase } from "./expo-environment";

/** 1인칭 둘러보기 정원: 캐릭터 없이 내가 언덕 위 정원에 서 있고, 드래그(관성)로 좌우를 둘러봄 */

/** 언덕 위 전망대: 멀리서 정원 전체를 내려다봄 */
/** 풍차 언덕과 등대 언덕 */
const WIND_HILL = { x: -15, z: -36 };
const LIGHT_HILL = { x: 40, z: -62 };
const CAM_Z = 36;
const CAM = { x: 0, y: height(0, CAM_Z) + 5, z: CAM_Z };
const BASE_PITCH = -0.04; // 살짝 올려다봐 하늘과 구름이 보이게
const MAX_YAW = 0.8; // 좌우 약 ±46°
const MAX_PITCH = 0.16;

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
  const slope = Math.max(0, CAM_Z - z) * 0.055;
  return (
    slope + Math.sin(x * 0.05) * 0.9 + Math.cos(z * 0.045 + x * 0.03) * 0.8 + far + side - 1 +
    mound(WIND_HILL, 11, 520) + mound(LIGHT_HILL, 13, 600) + mound({ x: 26, z: -22 }, 3.5, 380) + mound({ x: -42, z: -8 }, 3, 300)
  );
}

/** 세로 화면(폰)에서는 시야를 넓혀 풍차·등대·바람개비가 잘리지 않게 */
function ResponsiveFov() {
  const { camera, size } = useThree();
  useEffect(() => {
    const c = camera as THREE.PerspectiveCamera;
    c.fov = size.width / size.height < 1 ? 72 : 52;
    c.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/** 드래그로 둘러보기. 손을 떼면 속도가 서서히 줄어듦(관성 감쇠) */
function DragLook({ paused, reducedMotion }: { paused: boolean; reducedMotion: boolean }) {
  const { gl } = useThree();
  const state = useRef({ yaw: 0, pitch: 0, vyaw: 0, vpitch: 0, drag: false, x: 0, y: 0 });

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
      // 가장자리에서 튕기지 않고 멈춤
      if (Math.abs(state.current.yaw) >= MAX_YAW) state.current.vyaw = 0;
    }
    // 가만히 있으면 숨 쉬듯 아주 조금 흔들려 "서 있는" 느낌을 줌
    const t = performance.now() / 1000;
    const sway = reducedMotion ? 0 : Math.sin(t * 0.5) * 0.004;
    camera.position.set(CAM.x, CAM.y + (reducedMotion ? 0 : Math.sin(t * 0.9) * 0.02), CAM.z);
    camera.rotation.order = "YXZ";
    camera.rotation.set(BASE_PITCH - state.current.pitch * 0.6 + sway, -state.current.yaw, 0);
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
      const z = near ? CAM_Z - 4 - r() * 22 : CAM_Z - r() * 110;
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
      base.set([(r() - 0.5) * 70, 1 + r() * (night ? 5 : 9), CAM_Z - 8 - r() * 70], i * 3);
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

/** 멀리 언덕 위에 선 풍차와 등대 */
function Landmarks({ phase, still }: { phase: GardenPhase; still: boolean }) {
  const W = WIND_HILL;
  const L = LIGHT_HILL;
  return (
    <group>
      <group position={[W.x, height(W.x, W.z) - 0.3, W.z]} rotation={[0, 0.5, 0]} scale={1.15}>
        <Windmill still={still} />
      </group>
      <group position={[L.x, height(L.x, L.z) - 0.3, L.z]} scale={1.2}>
        <Lighthouse phase={phase} still={still} />
      </group>
    </group>
  );
}

export interface LookPerson { id: string; lightCount?: number }
export interface LookBoost { id: string; at: number }

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
  const blade = useMemo(() => {
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
    return g;
  }, []);
  useEffect(() => () => blade.dispose(), [blade]);

  // 정원 전체를 바람개비로: 해바라기 씨앗 배열(황금각)로 들판에 고르게, 서로 떨어뜨려 흩뿌림
  const spots = useMemo(() => {
    const r = rng(404);
    const n = people.length;
    const CX = 0;
    const CZ = -32;
    const RX = 74;
    const RZ = 62;
    const spacing = Math.sqrt((Math.PI * RX * RZ) / Math.max(n, 1));
    const base = Math.min(1.2, Math.max(0.65, spacing * 0.2));
    const out: { x: number; y: number; z: number; scale: number }[] = [];
    for (let i = 0; out.length < n && i < n * 6; i++) {
      const k = out.length;
      const rad = Math.sqrt((k + 0.5) / n);
      const th = k * 2.399963;
      const x = CX + Math.cos(th) * rad * RX + (r() - 0.5) * spacing * 0.35;
      const z = Math.min(CZ + Math.sin(th) * rad * RZ + (r() - 0.5) * spacing * 0.35, CAM_Z - 17);
      // 풍차·등대 자리와 오솔길 한가운데는 비움
      if (Math.hypot(x - WIND_HILL.x, z - WIND_HILL.z) < 6 || Math.hypot(x - LIGHT_HILL.x, z - LIGHT_HILL.z) < 6) { const px = x * 0.7; const pz = z * 0.7 + 10; out.push({ x: px, z: pz, y: height(px, pz), scale: base }); continue; }
      const dist = Math.hypot(x - CAM.x, z - CAM.z);
      out.push({ x, z, y: height(x, z), scale: base * THREE.MathUtils.clamp(dist / 34, 0.45, 1.7) * (1 + r() * 0.15) });
    }
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
  onReady?: () => void;
}

function Content({ phase, weather, reducedMotion, paused, december, people, boost, onSelect, onReady }: LookSceneProps) {
  const player = useRef({ x: 0, z: 8 });
  useEffect(() => { onReady?.(); }, [onReady]);
  const still = reducedMotion || paused;
  const night = phase === "night";
  return (
    <>
      <ResponsiveFov />
      <DragLook paused={paused} reducedMotion={reducedMotion} />
      <Atmosphere phase={phase} overview={false} weather={weather?.kind} exponential />
      <Field phase={phase} still={still} />
      <Path />
      <Trees />
      <Landmarks phase={phase} still={still} />
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
      camera={{ position: [CAM.x, CAM.y, CAM.z], fov: 52, near: 0.5, far: 1200 }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ touchAction: "none" }}
    >
      <Content {...props} />
    </Canvas>
  );
}

export default memo(LookScene);
