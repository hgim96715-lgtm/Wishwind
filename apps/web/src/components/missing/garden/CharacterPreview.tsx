"use client";

import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { Avatar } from "./Avatar";

/** 고르기 화면의 작은 미리보기: 천천히 돌며 서 있는 동작을 보여 줌 */
export default function CharacterPreview({ url, all = [] }: { url: string | null; all?: string[] }) {
  // 넘겨 볼 캐릭터를 미리 받아 둠 → 다음 버튼을 눌러도 기다림 없이 바로 바뀜
  useEffect(() => {
    for (const u of all) useGLTF.preload(u);
  }, [all]);
  return (
    <Canvas camera={{ fov: 30, position: [0, 1.2, 5.2] }} onCreated={({ camera }) => camera.lookAt(0, 0.75, 0)} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} aria-hidden>
      <hemisphereLight args={["#ffffff", "#f3dcc4", 2.2]} />
      <directionalLight position={[2, 4, 3]} intensity={1.2} />
      <Turntable key={url ?? "none"} url={url} />
    </Canvas>
  );
}

function Turntable({ url }: { url: string | null }) {
  const g = useRef<THREE.Group>(null);
  const still = useRef(0);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.6;
  });
  return (
    <group ref={g} position={[0, -0.05, 0]}>
      <Avatar url={url} speedRef={still} loading="none" />
    </group>
  );
}
