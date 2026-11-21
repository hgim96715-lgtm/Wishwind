"use client";
/* 언덕의 풍경: 가끔 하늘을 지나가는 비행기, 등대 불빛 */

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

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
