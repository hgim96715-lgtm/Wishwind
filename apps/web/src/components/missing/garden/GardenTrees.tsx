"use client";
import { useFrame } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { GARDEN_CENTER, grassAmount, hash2, heightAt, inWater, pathAmount, pondDistance, pondsNear } from "./world";

const RANGE = 76;
const CELL = 14;
const MAX_TREES = 150;

const LOBES = [
  { x: -0.5, y: 1.88, z: 0.08, sx: 0.9, sy: 0.68, sz: 0.82 },
  { x: 0.5, y: 2.02, z: -0.02, sx: 0.88, sy: 0.72, sz: 0.86 },
  { x: 0, y: 2.48, z: 0.02, sx: 0.82, sy: 0.76, sz: 0.8 },
] as const;

const LEAF_COLORS = ["#6f9f64", "#82ad70", "#91ba7d"];
const BLOSSOM_COLORS = ["#d9a6b4", "#e5bac4", "#f0d0d5"];

/**
 * 전체 언덕에 고르게 흩어지는 낮은 활엽수.
 * - 플레이어 주변 격자마다 낮은 확률로 한 그루만 두어 한쪽에 군락이 몰리지 않음
 * - 길·연못·바람개비 정원 중심은 비워 이동과 시야를 방해하지 않음
 * - 줄기와 수관을 InstancedMesh 두 개로 합쳐 나무 수와 무관하게 draw call을 두 번으로 유지함
 */
export function GardenTrees({ player }: { player: React.RefObject<THREE.Vector3> }) {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const center = useRef<{ x: number; z: number } | null>(null);

  const rebuild = useCallback((cx: number, cz: number) => {
    const trunkMesh = trunks.current;
    const crownMesh = crowns.current;
    if (!trunkMesh || !crownMesh) return;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const color = new THREE.Color();
    const gx0 = Math.floor((cx - RANGE) / CELL);
    const gz0 = Math.floor((cz - RANGE) / CELL);
    const cells = Math.ceil((RANGE * 2) / CELL);
    let count = 0;

    for (let a = 0; a <= cells && count < MAX_TREES; a++) {
      for (let b = 0; b <= cells && count < MAX_TREES; b++) {
        const gx = gx0 + a;
        const gz = gz0 + b;
        if (hash2(gx * 1.7, gz * 0.9) > 0.5) continue;

        const x = (gx + 0.16 + hash2(gz + 3, gx - 5) * 0.68) * CELL;
        const z = (gz + 0.16 + hash2(gx - 7, gz + 2) * 0.68) * CELL;
        if (grassAmount(x, z) < 0.78 || pathAmount(x, z) > 0.06 || inWater(x, z)) continue;
        if (pondsNear(z, 9).some((pond) => pondDistance(pond, x, z) < 1.42)) continue;
        if (Math.hypot(x - GARDEN_CENTER[0], z - GARDEN_CENTER[1]) < 5) continue;

        const treeScale = 0.72 + hash2(gx + 11, gz - 9) * 0.33;
        const turn = hash2(gx * 3, gz * 5) * Math.PI * 2;
        const y = heightAt(x, z);
        const blossom = hash2(gx - 13, gz + 17) < 0.2;

        rotation.setFromAxisAngle(up, turn);
        position.set(x, y + 0.85 * treeScale, z);
        scale.set(treeScale, treeScale, treeScale);
        matrix.compose(position, rotation, scale);
        trunkMesh.setMatrixAt(count, matrix);

        const palette = blossom ? BLOSSOM_COLORS : LEAF_COLORS;
        LOBES.forEach((lobe, lobeIndex) => {
          const crownIndex = count * LOBES.length + lobeIndex;
          const cos = Math.cos(turn);
          const sin = Math.sin(turn);
          const lx = lobe.x * cos - lobe.z * sin;
          const lz = lobe.x * sin + lobe.z * cos;
          position.set(x + lx * treeScale, y + lobe.y * treeScale, z + lz * treeScale);
          rotation.setFromAxisAngle(up, turn + lobeIndex * 0.6);
          scale.set(lobe.sx * treeScale, lobe.sy * treeScale, lobe.sz * treeScale);
          matrix.compose(position, rotation, scale);
          crownMesh.setMatrixAt(crownIndex, matrix);
          crownMesh.setColorAt(crownIndex, color.set(palette[lobeIndex]));
        });
        count++;
      }
    }

    trunkMesh.count = count;
    crownMesh.count = count * LOBES.length;
    trunkMesh.instanceMatrix.needsUpdate = true;
    crownMesh.instanceMatrix.needsUpdate = true;
    if (crownMesh.instanceColor) crownMesh.instanceColor.needsUpdate = true;
    center.current = { x: cx, z: cz };
  }, []);

  useLayoutEffect(() => {
    const p = player.current;
    rebuild(Math.round(p.x / CELL) * CELL, Math.round(p.z / CELL) * CELL);
  }, [player, rebuild]);

  useFrame(() => {
    const p = player.current;
    const current = center.current;
    if (current && Math.hypot(p.x - current.x, p.z - current.z) > CELL * 1.5) {
      rebuild(Math.round(p.x / CELL) * CELL, Math.round(p.z / CELL) * CELL);
    }
  });

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, MAX_TREES]} frustumCulled={false}>
        <cylinderGeometry args={[0.14, 0.23, 1.7, 8]} />
        <meshStandardMaterial color="#76523d" roughness={0.96} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, MAX_TREES * LOBES.length]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial roughness={0.92} />
      </instancedMesh>
    </group>
  );
}
