"use client";

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

function lotusGeometry() {
  const petals: THREE.BufferGeometry[] = [];

  for (let i = 0; i < 8; i++) {
    const petal = new THREE.SphereGeometry(1, 8, 5);
    petal.scale(0.13, 0.028, 0.065);
    petal.translate(0.095, 0.025, 0);
    petal.rotateZ(-0.13);
    petal.rotateY((i / 8) * Math.PI * 2);
    petals.push(petal.toNonIndexed());
  }

  for (let i = 0; i < 6; i++) {
    const petal = new THREE.SphereGeometry(1, 8, 5);
    petal.scale(0.085, 0.032, 0.048);
    petal.translate(0.05, 0.064, 0);
    petal.rotateZ(-0.28);
    petal.rotateY((i / 6) * Math.PI * 2 + Math.PI / 6);
    petals.push(petal.toNonIndexed());
  }

  const merged = mergeGeometries(petals);
  merged.computeVertexNormals();
  return merged;
}

const LOTUS_GEOMETRY = lotusGeometry();

/** 수련잎 위에 피는 작은 연꽃: 바깥 꽃잎 8장, 안쪽 꽃잎 6장, 노란 꽃술로 구성됨 */
export function LotusFlower({ color, rotation, scale }: { color: string; rotation: number; scale: number }) {
  return (
    <group position-y={0.025} rotation-y={rotation} scale={scale}>
      <mesh geometry={LOTUS_GEOMETRY}>
        <meshStandardMaterial color={color} roughness={0.82} side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={0.085}>
        <sphereGeometry args={[0.035, 8, 5]} />
        <meshStandardMaterial color="#f4c653" roughness={0.75} />
      </mesh>
    </group>
  );
}
