"use client";

import { useRef } from "react";

/** 모바일 가상 조이스틱: 값과 손잡이를 직접 갱신하여 포인터 이동 중 React 리렌더를 만들지 않음 */
export function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const base = useRef<HTMLDivElement>(null);
  const knob=useRef<HTMLDivElement>(null);
  const moveKnob=(x:number,y:number)=>{
    if(knob.current)knob.current.style.transform=`translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  };

  const update = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const R=r.width*.39;
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > R) {
      dx = (dx / l) * R;
      dy = (dy / l) * R;
    }
    moveKnob(dx,dy);
    onChange(dx / R, -dy / R);
  };
  const end = () => {
    moveKnob(0,0);
    onChange(0, 0);
  };

  return (
    <div
      ref={base}
      role="presentation"
      className="relative size-20 sm:size-28 touch-none rounded-full bg-white/40 shadow-inner backdrop-blur"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => e.buttons > 0 && update(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <div
        ref={knob}
        className="absolute top-1/2 left-1/2 size-9 sm:size-12 rounded-full bg-white/90 shadow"
        style={{ transform: "translate(-50%, -50%)",willChange:"transform" }}
      />
    </div>
  );
}
