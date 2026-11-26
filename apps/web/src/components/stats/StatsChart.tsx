"use client";

import { useEffect, useRef, useState } from "react";
import type { Point } from "@/lib/stats/crime";

export interface ChartSeries {
  id: string;
  label: string;
  /** CSS 색 (색 토큰 var(--color-*)) */
  color: string;
  points: readonly Point[];
}

/** 최댓값을 눈금 4칸으로 나눴을 때 떨어지는 값 (1·2·2.5·3·4·5·6·8·10 배수) */
function niceStep(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
}

const fmt = (v: number) => v.toLocaleString("ko-KR", { maximumFractionDigits: 1 });

/**
 * 선 차트. 가로 폭을 재서 그 크기 그대로 그리므로 화면이 넓어져도 글자가 커지지 않음.
 * 세로 눈금은 항상 0부터 시작해 변화가 실제보다 커 보이지 않게 함
 */
export function StatsChart({ series, suffix = "", label }: { series: ChartSeries[]; suffix?: string; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    setW(Math.round(el.clientWidth) || 640);
    const ro = new ResizeObserver(([entry]) => setW(Math.round(entry.contentRect.width) || 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const all = series.flatMap((s) => s.points);
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const step = niceStep(Math.max(...all.map((p) => p[1])));
  const top = step * 4;
  const H = W < 480 ? 210 : 250;
  const padL = fmt(top).length * 7 + 14 + (suffix ? 8 : 0);
  const PAD = { l: padL, r: 14, t: 26, b: 28 };
  const x = (yr: number) => PAD.l + ((yr - minX) / Math.max(1, maxX - minX)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
  const span = maxX - minX;
  const xStep = span <= 12 ? (W < 480 && span > 6 ? 2 : 1) : 3;
  const xTicks = Array.from({ length: Math.floor(span / xStep) + 1 }, (_, i) => minX + i * xStep);

  return (
    <div ref={box} className="w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(i * step)} y2={y(i * step)} stroke="var(--color-line)" strokeWidth={1} strokeDasharray={i === 0 ? undefined : "3 4"} />
            <text x={PAD.l - 8} y={y(i * step) + 4} textAnchor="end" fontSize={11} fill="var(--color-subtle)">
              {fmt(i * step)}
              {suffix}
            </text>
          </g>
        ))}
        {xTicks.map((yr) => (
          <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--color-subtle)">
            {yr}
          </text>
        ))}
        {series.map((s) => {
          const last = s.points[s.points.length - 1];
          const line = s.points.map(([yr, v]) => `${x(yr)},${y(v)}`).join(" ");
          return (
            <g key={s.id} style={{ color: s.color }}>
              <polygon points={`${x(s.points[0][0])},${y(0)} ${line} ${x(last[0])},${y(0)}`} fill="currentColor" opacity={0.1} />
              <polyline fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={line} />
              {s.points.map(([yr, v]) => (
                <circle key={yr} cx={x(yr)} cy={y(v)} r={yr === last[0] ? 4.5 : 3} fill={yr === last[0] ? "currentColor" : "var(--color-surface)"} stroke="currentColor" strokeWidth={2}>
                  <title>{`${s.label} ${yr}년 ${fmt(v)}${suffix || "건"}`}</title>
                </circle>
              ))}
              <text x={x(last[0])} y={y(last[1]) - 11} textAnchor="end" fontSize={12} fontWeight={700} fill="currentColor">
                {fmt(last[1])}
                {suffix}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
