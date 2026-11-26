"use client";

import { useState } from "react";
import { LuChartLine } from "react-icons/lu";
import { StatsChart } from "@/components/stats/StatsChart";
import {
  CHECKED_ON,
  CRIME_NOTES,
  CRIME_RATE,
  CRIME_SOURCE,
  RECIDIVISM,
  RECIDIVISM_SOURCE,
} from "@/lib/stats/crime";

type Tab = "trend" | "recidivism";

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? "border-foreground bg-foreground font-semibold text-surface" : "border-line bg-surface hover:border-foreground/40"}`;

const fmt = (v: number) => v.toLocaleString("ko-KR", { maximumFractionDigits: 1 });

/** 처음 해와 마지막 해를 견준 변화 (원본 숫자로 계산만 함) */
function change(points: readonly (readonly [number, number])[]) {
  const first = points[0];
  const last = points[points.length - 1];
  const pct = ((last[1] - first[1]) / first[1]) * 100;
  return { first, last, pct };
}

const pctText = (pct: number) => `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct).toFixed(0)}%`;

/** 브리핑룸 '숫자로 보기': 공식 통계로 범죄가 늘었는지 줄었는지, 재범은 얼마나 되는지 */
export function CrimeStats() {
  const [tab, setTab] = useState<Tab>("trend");
  const [crimeId, setCrimeId] = useState<string>("all");
  const [hidden, setHidden] = useState<string[]>([]);

  const crime = CRIME_RATE.find((c) => c.id === crimeId) ?? CRIME_RATE[0];
  const crimeChange = change(crime.points);
  const release = RECIDIVISM[0];
  const releaseLast = release.points[release.points.length - 1];

  return (
    <section aria-labelledby="stats-title" className="mt-14">
      <h2 id="stats-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-subtle">
        <LuChartLine aria-hidden className="size-4 text-brand-fg" />
        숫자로 보기
      </h2>
      <p className="mt-1 text-sm text-muted">공식 통계로 범죄가 늘었는지 줄었는지, 다시 죄를 짓는 사람이 얼마나 되는지 봅니다.</p>

      <div role="tablist" aria-label="통계 종류" className="mt-4 flex gap-2">
        <button type="button" role="tab" aria-selected={tab === "trend"} onClick={() => setTab("trend")} className={chip(tab === "trend")}>
          범죄 추이
        </button>
        <button type="button" role="tab" aria-selected={tab === "recidivism"} onClick={() => setTab("recidivism")} className={chip(tab === "recidivism")}>
          재범
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        {tab === "trend" ? (
          <>
            <div className="flex flex-wrap gap-2">
              {CRIME_RATE.map((c) => (
                <button key={c.id} type="button" aria-pressed={c.id === crimeId} onClick={() => setCrimeId(c.id)} className={chip(c.id === crimeId)}>
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-lg font-semibold leading-snug">
              {crime.label}: {crimeChange.first[0]}년 {fmt(crimeChange.first[1])}건 → {crimeChange.last[0]}년 {fmt(crimeChange.last[1])}건{" "}
              <span className={crimeChange.pct <= 0 ? "text-jade-ink" : "text-clay-ink"}>({pctText(crimeChange.pct)})</span>
            </p>
            <p className="text-xs text-subtle">인구 10만 명당 발생건수</p>
            <div className="mt-3">
              <StatsChart
                series={[{ id: crime.id, label: crime.label, color: "var(--color-brand-fg)", points: crime.points }]}
                unit="건 / 인구 10만 명"
                label={`${crime.label} 인구 10만 명당 발생건수 추이`}
              />
            </div>
            {CRIME_NOTES[crime.id] && <p className="mt-2 text-sm leading-6 text-muted">{CRIME_NOTES[crime.id]}</p>}

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[22rem] text-sm">
                <caption className="pb-2 text-left text-xs text-subtle">
                  {CRIME_RATE[0].points[0][0]}년 → {CRIME_RATE[0].points[CRIME_RATE[0].points.length - 1][0]}년, 한눈에
                </caption>
                <tbody>
                  {CRIME_RATE.slice(1).map((c) => {
                    const ch = change(c.points);
                    return (
                      <tr key={c.id} className="border-t border-line">
                        <th scope="row" className="py-2 pr-3 text-left font-medium">{c.label}</th>
                        <td className="py-2 pr-3 tabular-nums text-muted">
                          {fmt(ch.first[1])} → {fmt(ch.last[1])}
                        </td>
                        <td className={`py-2 text-right font-semibold tabular-nums ${ch.pct <= 0 ? "text-jade-ink" : "text-clay-ink"}`}>
                          {ch.pct <= 0 ? "▼" : "▲"} {pctText(ch.pct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs leading-5 text-subtle">
              형법범죄 발생건수를 인구 10만 명당으로 환산한 값입니다. 법이 바뀌거나 신고하는 분위기가 달라지면 숫자도 달라질 수 있어, 숫자의 늘고 줄음이 곧 사회의 안전 정도를 뜻하지는 않습니다.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold leading-snug">
              출소자 {fmt(releaseLast[1])}%가 3년 안에 다시 교도소에 들어갔습니다 ({releaseLast[0]}년).
            </p>
            <p className="mt-1 text-sm text-muted">나머지 {fmt(100 - releaseLast[1])}%는 3년 안에 돌아오지 않았습니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {RECIDIVISM.map((s) => {
                const off = hidden.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={!off}
                    onClick={() => setHidden(off ? hidden.filter((h) => h !== s.id) : [...hidden, s.id])}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${off ? "border-line bg-surface text-subtle" : "border-foreground/40 bg-surface font-semibold"}`}
                  >
                    <span aria-hidden className="size-2.5 rounded-full" style={{ background: off ? "var(--color-line)" : s.color }} />
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3">
              {hidden.length < RECIDIVISM.length ? (
                <StatsChart
                  series={RECIDIVISM.filter((s) => !hidden.includes(s.id)).map((s) => ({ id: s.id, label: s.label, color: s.color, points: s.points }))}
                  unit="%"
                  label="재범률과 재복역률 추이"
                />
              ) : (
                <p className="py-10 text-center text-sm text-muted">보고 싶은 항목을 눌러 주세요.</p>
              )}
            </div>
            <dl className="mt-4 space-y-2 text-sm leading-6">
              {RECIDIVISM.map((s) => (
                <div key={s.id}>
                  <dt className="inline font-medium" style={{ color: s.color }}>{s.label}</dt>
                  <dd className="inline text-muted"> · {s.help}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-5 text-subtle">
              다시 교도소 등에 들어간 경우만 세므로 실제로 다시 죄를 지은 사람 전체와 같지 않습니다. 뉴스에 나오는 전과가 아주 많은 사람의 사례는 눈에 띄는 경우이고, 이 평균을 대표하지 않습니다.
            </p>
          </>
        )}

        <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-subtle">
          출처: {tab === "trend" ? CRIME_SOURCE : RECIDIVISM_SOURCE}. {CHECKED_ON} 확인.
        </p>
      </div>
    </section>
  );
}
