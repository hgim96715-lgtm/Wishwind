"use client";

import { useRef, useState } from "react";

/** 모바일 가상 조이스틱: 값은 ref로만 넘겨 매 프레임 리렌더를 만들지 않음 (손잡이 위치만 state) */
export function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const R = 44;

  const update = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > R) {
      dx = (dx / l) * R;
      dy = (dy / l) * R;
    }
    setKnob({ x: dx, y: dy });
    onChange(dx / R, -dy / R);
  };
  const end = () => {
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div
      ref={base}
      role="presentation"
      className="relative size-28 touch-none rounded-full bg-white/40 shadow-inner backdrop-blur"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => e.buttons > 0 && update(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute top-1/2 left-1/2 size-12 rounded-full bg-white/90 shadow"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
