"use client";
// DOM 위치를 매 프레임 직접 바꾸는 게 목적(리렌더 없이) → 불변성 규칙만 끔
/* eslint-disable react-hooks/immutability */

import { useFrame } from "@react-three/fiber";
import { useMemo, useSyncExternalStore } from "react";
import * as THREE from "three";

/**
 * 3D 위 글자(지역 표지판·바람개비 말풍선·닉네임)를 캔버스 밖 DOM 한 겹에 그리는 장치
 * drei <Html>은 글자마다 React root를 따로 만들어, 생기고 사라질 때
 * "synchronously unmount a root" 경고가 남. 여기서는 일반 React 트리에 그리고
 * 위치만 매 프레임 카메라로 투영해 style.transform에 직접 씀 (리렌더 없음)
 */
export type LabelVariant = "sign" | "bubble" | "bubble-fresh" | "bubble-pending" | "name";

export interface Label {
  id: string;
  text: string;
  variant: LabelVariant;
  /** 고정 위치 */
  pos?: [number, number, number];
  /** 움직이는 대상(플레이어)을 따라감 */
  follow?: React.RefObject<THREE.Vector3>;
  offsetY?: number;
}

export interface LabelStore {
  set: (group: string, labels: Label[]) => void;
  all: () => Label[];
  subscribe: (fn: () => void) => () => void;
  els: Map<string, HTMLDivElement>;
}

export function createLabelStore(): LabelStore {
  const groups = new Map<string, Label[]>();
  const listeners = new Set<() => void>();
  let snapshot: Label[] = [];
  return {
    set(group, labels) {
      groups.set(group, labels);
      snapshot = [...groups.values()].flat();
      listeners.forEach((l) => l());
    },
    all: () => snapshot,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    els: new Map(),
  };
}

const STYLE: Record<LabelVariant, { className: string; size: number }> = {
  sign: { className: "rounded-full bg-white/85 px-4 py-1.5 text-sm font-medium whitespace-nowrap text-[#5b4d3c] shadow-sm", size: 14 },
  bubble: { className: "max-w-44 rounded-2xl bg-white/90 px-3 py-1.5 text-xs leading-snug text-[#5b4d3c] shadow-sm", size: 9 },
  "bubble-fresh": {
    className: "max-w-44 rounded-2xl bg-[#fff4d6] px-3 py-1.5 text-xs leading-snug text-[#6b4f2a] shadow-sm ring-2 ring-[#ffd166]",
    size: 9,
  },
  "bubble-pending": {
    className: "max-w-44 rounded-2xl border border-dashed border-[#d9c4a3] bg-white/90 px-3 py-1.5 text-xs leading-snug text-[#5b4d3c] shadow-sm",
    size: 9,
  },
  name: { className: "rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-[#5b4d3c] shadow-sm", size: 8 },
};

/** 캔버스 위에 겹치는 DOM 층 (Canvas 밖, 같은 부모 안) */
export function LabelOverlay({ store }: { store: LabelStore }) {
  const labels = useSyncExternalStore(store.subscribe, store.all, store.all);
  return (
    // isolate: 글자끼리의 z-index(거리순)가 이 층 안에서만 비교되게 함 → 카드·패널 위로 뚫고 나오지 않음
    <div className="pointer-events-none absolute inset-0 isolate z-0 overflow-hidden" aria-hidden>
      {labels.map((l) => (
        <div
          key={l.id}
          ref={(el) => {
            if (el) store.els.set(l.id, el);
            else store.els.delete(l.id);
          }}
          className="absolute top-0 left-0 origin-bottom will-change-transform"
          style={{ visibility: "hidden" }}
        >
          <div className={STYLE[l.variant].className}>
            {l.text}
            {l.variant === "bubble-pending" && <span className="ml-1 text-[10px] text-[#9a8a76]">(확인 중)</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Canvas 안: 매 프레임 각 글자의 3D 위치를 화면 좌표로 바꿔 DOM에 직접 적용 */
export function LabelProjector({ store }: { store: LabelStore }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    for (const l of store.all()) {
      const el = store.els.get(l.id);
      if (!el) continue;
      if (l.follow) v.copy(l.follow.current);
      else if (l.pos) v.set(l.pos[0], l.pos[1], l.pos[2]);
      else continue;
      v.y += l.offsetY ?? 0;
      const dist = camera.position.distanceTo(v);
      v.project(camera);
      if (v.z > 1 || dist > 70 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) {
        el.style.visibility = "hidden";
        continue;
      }
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      const scale = Math.min(1.15, Math.max(0.35, STYLE[l.variant].size / dist));
      el.style.visibility = "visible";
      el.style.zIndex = String(Math.round(1000 - dist));
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) scale(${scale})`;
    }
  });
  return null;
}
