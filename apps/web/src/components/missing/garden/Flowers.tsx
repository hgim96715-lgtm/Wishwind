"use client";
/*
 * three.js 객체(행렬·셰이더 값)는 매 프레임 직접 바꾸는 게 R3F의 정상 방식이라 불변성 규칙만 끔 (GardenScene과 같음)
 */
/* eslint-disable react-hooks/immutability */

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { grassAmount, hash2, heightAt, inWater, pathAmount, pondDistance, pondsNear } from "./world";

/**
 * 언덕의 들꽃: 꽃잎 다섯 장이 보이는 작은 꽃이 여러 위치에 흩어져 핌
 * - 작은 격자 칸마다 낮은 확률로 작은 군락 하나가 생겨, 큰 한 무리처럼 뭉치지 않음
 * - 연못 표면·물가 여유 영역·길에는 꽃을 만들지 않음
 * - 바람에 다 같이 살랑 흔들림 (셰이더에서 시간으로만 계산 → 매 프레임 행렬을 바꾸지 않음)
 * - 플레이어 주변만 그리고, 멀리 걸어가면 그 자리 기준으로 다시 깜. 같은 칸은 늘 같은 꽃이 핌
 */
const RANGE = 64;
const CELL = 6.5;
const MAX = 2600;
/** 무리마다 고르는 꽃잎 색 (부드러운 파스텔 + 흰색) */
const PETALS = ["#fff6e8", "#ffd4de", "#f6b4c6", "#d9c8f5", "#ffe7a3", "#ffc9a1", "#bfe0ff"];

type GroundState = { wet: number; snow: number };

/** 꽃 한 송이 모양: 줄기·잎 / 꽃잎 / 꽃술을 따로 만들어 색을 나눔 (원점 = 땅) */
function flowerParts() {
  const stem = new THREE.CylinderGeometry(0.01, 0.014, 0.2, 4, 1);
  stem.translate(0, 0.1, 0);
  const leaf = new THREE.SphereGeometry(1, 6, 3);
  leaf.scale(0.08, 0.014, 0.035);
  leaf.rotateZ(0.4);
  leaf.translate(0.055, 0.06, 0);
  const green = mergeGeometries([stem.toNonIndexed(), leaf.toNonIndexed()]);

  const petals: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.SphereGeometry(1, 7, 4);
    p.scale(0.1, 0.02, 0.062);
    p.translate(0.095, 0, 0);
    p.rotateY((i / 5) * Math.PI * 2);
    petals.push(p.toNonIndexed());
  }
  const petal = mergeGeometries(petals);
  // 꽃이 살짝 하늘을 보도록 기울임
  petal.rotateX(-0.35);
  petal.translate(0, 0.21, 0);

  const center = new THREE.SphereGeometry(0.045, 8, 5);
  center.scale(1, 0.6, 1);
  center.translate(0, 0.228, 0);
  return { green, petal, center };
}

/** 바람에 흔들림: 높이(꽃 쪽)일수록, 꽃마다 조금씩 다른 박자로 기울어짐 */
function swayMaterial(params: THREE.MeshStandardMaterialParameters, time: { value: number }) {
  const m = new THREE.MeshStandardMaterial(params);
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float h = clamp(position.y / 0.23, 0.0, 1.0);
        vec3 base = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
        float phase = base.x * 0.35 + base.z * 0.27;
        float sway = sin(uTime * 1.7 + phase) * 0.06 + sin(uTime * 3.1 + phase * 1.7) * 0.02;
        transformed.x += sway * h * h;
        transformed.z += sway * 0.4 * h * h;`,
      );
  };
  return m;
}

export function Flowers({ player, ground }: { player: React.RefObject<THREE.Vector3>; ground: React.RefObject<GroundState> }) {
  const greens = useRef<THREE.InstancedMesh>(null);
  const petals = useRef<THREE.InstancedMesh>(null);
  const centers = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const center = useRef<{ x: number; z: number } | null>(null);
  const time = useMemo(() => ({ value: 0 }), []);
  const geo = useMemo(() => flowerParts(), []);
  const mats = useMemo(
    () => ({
      green: swayMaterial({ color: "#5f9c57", roughness: 1 }, time),
      petal: swayMaterial({ roughness: 0.85 }, time),
      center: swayMaterial({ color: "#f2b632", roughness: 0.8 }, time),
    }),
    [time],
  );

  const rebuild = (cx: number, cz: number) => {
    const g = greens.current;
    const p = petals.current;
    const c = centers.current;
    if (!g || !p || !c) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const color = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    let n = 0;
    const gx0 = Math.floor((cx - RANGE) / CELL);
    const gz0 = Math.floor((cz - RANGE) / CELL);
    const cells = Math.ceil((RANGE * 2) / CELL);
    for (let a = 0; a <= cells && n < MAX; a++) {
      for (let b = 0; b <= cells && n < MAX; b++) {
        const gx = gx0 + a;
        const gz = gz0 + b;
        // 작은 군락을 여러 곳에 분산시킴. 한 화면에 큰 색 덩어리가 생기지 않도록 밀도를 낮춤
        if (hash2(gx * 1.3, gz * 0.7) > 0.28) continue;
        const mx = (gx + 0.18 + hash2(gz, gx) * 0.64) * CELL;
        const mz = (gz + 0.18 + hash2(gx + 3, gz - 5) * 0.64) * CELL;
        const radius = 0.7 + hash2(gx - 2, gz + 9) * 1.8;
        const count = 4 + Math.floor(hash2(gx + 11, gz) * 8);
        for (let k = 0; k < count && n < MAX; k++) {
          // 군락 안에서도 중심을 약하게 유지해, 꽃이 한 점에 겹치지 않게 함
          const r = radius * Math.sqrt(hash2(gx * 7 + k, gz * 3 - k));
          const t = hash2(gx + k * 13, gz - k * 7) * Math.PI * 2;
          const x = mx + Math.cos(t) * r;
          const z = mz + Math.sin(t) * r;
          if (grassAmount(x, z) < 0.85 || pathAmount(x, z) > 0.05) continue;
          // 실제 물 표면보다 넓게 제외해 연못 가장자리에서 꽃이 떠 보이지 않게 함
          if (inWater(x, z) || pondsNear(z, 8).some((pd) => pondDistance(pd, x, z) < 1.24)) continue;
          const size = 0.85 + hash2(k * 5 + gx, gz) * 0.55;
          q.setFromAxisAngle(up, hash2(k + gz, gx - k) * Math.PI * 2);
          s.set(size, size * (0.85 + hash2(gx, k + gz) * 0.4), size);
          pos.set(x, heightAt(x, z) - 0.01, z);
          m.compose(pos, q, s);
          g.setMatrixAt(n, m);
          p.setMatrixAt(n, m);
          c.setMatrixAt(n, m);
          // 군락의 색을 고정하지 않고 꽃마다 부드러운 파스텔 색을 섞음
          color.set(PETALS[Math.floor(hash2(gx * 5 + k, gz * 3 - k) * PETALS.length)]);
          p.setColorAt(n, color);
          n++;
        }
      }
    }
    for (const mesh of [g, p, c]) {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    center.current = { x: cx, z: cz };
  };

  useLayoutEffect(() => {
    const pl = player.current;
    rebuild(Math.round(pl.x / 10) * 10, Math.round(pl.z / 10) * 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(({ clock }) => {
    time.value = clock.elapsedTime;
    const pl = player.current;
    const cc = center.current;
    if (cc && Math.hypot(pl.x - cc.x, pl.z - cc.z) > 22) rebuild(Math.round(pl.x / 10) * 10, Math.round(pl.z / 10) * 10);
    // 눈이 쌓이면 꽃이 눈 속으로 묻힘
    if (group.current) {
      const snow = ground.current.snow;
      group.current.position.y = -0.3 * Math.min(1, snow * 1.3);
      group.current.visible = snow < 0.95;
    }
  });

  return (
    <group ref={group}>
      <instancedMesh ref={greens} args={[geo.green, mats.green, MAX]} frustumCulled={false} />
      <instancedMesh ref={petals} args={[geo.petal, mats.petal, MAX]} frustumCulled={false} />
      <instancedMesh ref={centers} args={[geo.center, mats.center, MAX]} frustumCulled={false} />
    </group>
  );
}
