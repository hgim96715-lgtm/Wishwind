import type { Point } from "@/lib/stats/crime";

export interface ChartSeries {
  id: string;
  label: string;
  /** CSS 색 (색 토큰 var(--color-*)) */
  color: string;
  points: readonly Point[];
}

const W = 640;
const H = 280;
const PAD = { l: 58, r: 18, t: 22, b: 28 };

/** 최댓값을 눈금 4칸으로 나눴을 때 떨어지는 값 (1·2·2.5·5·10 배수) */
function niceStep(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw);
}

const fmt = (v: number) => v.toLocaleString("ko-KR", { maximumFractionDigits: 1 });

/** 선 차트. 세로 눈금은 항상 0부터 시작해 변화가 실제보다 커 보이지 않게 함 */
export function StatsChart({ series, unit, label }: { series: ChartSeries[]; unit: string; label: string }) {
  const all = series.flatMap((s) => s.points);
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const step = niceStep(Math.max(...all.map((p) => p[1])));
  const top = step * 4;
  const x = (yr: number) => PAD.l + ((yr - minX) / Math.max(1, maxX - minX)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
  const xStep = maxX - minX <= 12 ? 1 : 3;
  const xTicks = Array.from({ length: Math.floor((maxX - minX) / xStep) + 1 }, (_, i) => minX + i * xStep);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full">
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(i * step)} y2={y(i * step)} stroke="var(--color-line)" strokeWidth={1} />
          <text x={PAD.l - 6} y={y(i * step) + 4} textAnchor="end" fontSize={11} fill="var(--color-subtle)">
            {fmt(i * step)}
          </text>
        </g>
      ))}
      {xTicks.map((yr) => (
        <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--color-subtle)">
          {yr}
        </text>
      ))}
      <text x={PAD.l} y={10} fontSize={11} fill="var(--color-subtle)">
        {unit}
      </text>
      {series.map((s) => {
        const last = s.points[s.points.length - 1];
        return (
          <g key={s.id} style={{ color: s.color }}>
            <polyline fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={s.points.map(([yr, v]) => `${x(yr)},${y(v)}`).join(" ")} />
            {s.points.map(([yr, v]) => (
              <circle key={yr} cx={x(yr)} cy={y(v)} r={3} fill="var(--color-surface)" stroke="currentColor" strokeWidth={2}>
                <title>{`${s.label} ${yr}년 ${fmt(v)}${unit.startsWith("%") ? "%" : ""}`}</title>
              </circle>
            ))}
            <text x={x(last[0])} y={y(last[1]) - 10} textAnchor="end" fontSize={12} fontWeight={700} fill="currentColor">
              {fmt(last[1])}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
