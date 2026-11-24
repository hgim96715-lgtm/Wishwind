"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

export interface CharacterOption {
  id: string;
  url: string;
}

/** 캐릭터 목록 (public/models/characters/*.glb, Kenney Mini Characters CC0) */
export async function fetchCharacters(): Promise<CharacterOption[]> {
  try {
    const res = await fetch("/missing/characters");
    const body = (await res.json()) as { characters: CharacterOption[] };
    return body.characters ?? [];
  } catch {
    return [];
  }
}

/** 꼬마 캐릭터 느낌이 나도록 실제 사람보다 작게 맞춤 */
const HEIGHT = 1.35;

/** 걷는 속도(0 = 멈춤)를 ref로 받아 매 프레임 동작을 고름 → React 리렌더 없이 애니메이션 전환. url이 없으면 임시 모양 */
export function Avatar({
  url,
  speedRef,
  loading = "placeholder",
}: {
  url: string | null;
  speedRef: React.RefObject<number>;
  /** 모델을 받는 동안 보여 줄 것: 임시 모양 또는 아무것도 안 보이기(미리보기) */
  loading?: "placeholder" | "none";
}) {
  const placeholder = <Placeholder speedRef={speedRef} />;
  if (!url) return placeholder;
  return (
    <ModelBoundary key={url} fallback={placeholder}>
      <Suspense fallback={loading === "none" ? null : placeholder}>
        <Model url={url} speedRef={speedRef} />
      </Suspense>
    </ModelBoundary>
  );
}

function Model({ url, speedRef }: { url: string; speedRef: React.RefObject<number> }) {
  const { scene, animations } = useGLTF(url);
  const {gl}=useThree();
  // 같은 모델을 여러 번 써도 뼈대가 섞이지 않게 SkeletonUtils로 복제
  const model = useMemo(() => {
    const m = cloneSkinned(scene);
    const box = new THREE.Box3().setFromObject(m);
    const h = box.max.y - box.min.y || 1;
    m.scale.setScalar(HEIGHT / h);
    m.position.y = -box.min.y * (HEIGHT / h);
    m.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = false;
    });
    return m;
  }, [scene]);
  const root = useRef<THREE.Group>(null);
  const { actions, names, mixer } = useAnimations(animations, root);
  const clip = useMemo(() => {
    const find = (re: RegExp) => names.find((n) => re.test(n) && !/death|die|punch|hit|sword|gun|shoot/i.test(n));
    return { idle: find(/idle/i), walk: find(/walk/i), run: find(/run|sprint/i) ?? find(/walk/i) };
  }, [names]);
  const current = useRef<string | undefined>(undefined);

  useEffect(() => {
    const name = clip.idle;
    if (name) {
      actions[name]?.reset().fadeIn(0.2).play();
      current.current = name;
    }
    return()=>{mixer.stopAllAction();current.current=undefined;};
  }, [actions, clip, mixer]);

  useFrame(() => {
    const s = speedRef.current ?? 0;
    const want = s > 6 ? clip.run : s > 0.3 ? clip.walk : clip.idle;
    if(process.env.NODE_ENV!=="production"){gl.domElement.dataset.avatarModel=url;gl.domElement.dataset.avatarClip=current.current??"none";gl.domElement.dataset.avatarTime=String(current.current?actions[current.current]?.time??0:0);}
    if (!want || want === current.current) return;
    if (current.current) actions[current.current]?.fadeOut(0.2);
    actions[want]?.reset().fadeIn(0.2).play();
    current.current = want;
  });

  return (
    <group ref={root}>
      <primitive object={model} />
    </group>
  );
}

/** 모델 파일이 아직 없을 때 쓰는 임시 모양 */
function Placeholder({ speedRef }: { speedRef: React.RefObject<number> }) {
  const body = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const s = speedRef.current ?? 0;
    if (body.current) body.current.position.y = s > 0.3 ? Math.abs(Math.sin(clock.elapsedTime * 9)) * 0.08 : 0;
  });
  const color = "#f2a08f";
  return (
    <group ref={body}>
      <mesh position={[0, 0.65, 0]}>
        <capsuleGeometry args={[0.26, 0.7, 6, 12]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshStandardMaterial color="#f6dcc4" roughness={0.8} />
      </mesh>
    </group>
  );
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
