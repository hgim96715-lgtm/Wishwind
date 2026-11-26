"use client";

import { useState, type ReactNode } from "react";
import { LuArrowRight, LuChartLine, LuTrendingDown, LuTrendingUp } from "react-icons/lu";
import { StatsChart } from "@/components/stats/StatsChart";
import {
  CHECKED_ON,
  CRIME_NOTES,
  CRIME_RATE,
  CRIME_SOURCE,
  POLICE_CHECKED_ON,
  POLICE_COUNTS,
  POLICE_SOURCE,
  RECIDIVISM,
  RECIDIVISM_SOURCE,
} from "@/lib/stats/crime";

type Tab = "trend" | "recidivism" | "ours";

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? "border-foreground bg-foreground font-semibold text-surface" : "border-line bg-surface hover:border-foreground/40"}`;

/** 글자 화살표(→) 대신 쓰는 아이콘. 글자 높이에 맞춰 줄 안에 들어감 */
function Arrow() {
  return <LuArrowRight role="img" aria-label="에서" className="mx-1 inline size-[0.9em] align-[-0.12em]" />;
}

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
export function CrimeStats({ ourCases }: { ourCases?: ReactNode }) {
  const [tab, setTab] = useState<Tab>("trend");
  const [basis, setBasis] = useState<"rate" | "count">("rate");
  const [crimeId, setCrimeId] = useState<string>("all");
  const [recId, setRecId] = useState<string>("release");

  const dataset = basis === "rate" ? CRIME_RATE : POLICE_COUNTS;
  const crime = dataset.find((c) => c.id === crimeId) ?? dataset[0];
  const crimeChange = change(crime.points);
  const rec = RECIDIVISM.find((r) => r.id === recId) ?? RECIDIVISM[0];
  const recFirst = rec.points[0];
  const recLast = rec.points[rec.points.length - 1];

  return (
    <section aria-labelledby="numbers-title" className="mt-14">
      <h2 id="numbers-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-subtle">
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
        {ourCases && (
          <button type="button" role="tab" aria-selected={tab === "ours"} onClick={() => setTab("ours")} className={chip(tab === "ours")}>
            우리 사건 기록
          </button>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        {tab === "trend" ? (
          <>
            <div className="flex flex-wrap gap-2 border-b border-line pb-4">
              {(
                [
                  ["rate", "인구 10만 명당 (2013~2024)"],
                  ["count", "경찰청 발생 건수 (2018~2025)"],
                ] as const
              ).map(([id, text]) => (
                <button key={id} type="button" aria-pressed={basis === id} onClick={() => { setBasis(id); setCrimeId(id === "rate" ? "all" : "murder"); }} className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${basis === id ? "border-brand-fg font-semibold text-brand-fg" : "border-line text-muted hover:border-foreground/40"}`}>
                  {text}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {dataset.map((c) => (
                <button key={c.id} type="button" aria-pressed={c.id === crimeId} onClick={() => setCrimeId(c.id)} className={chip(c.id === crimeId)}>
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-lg font-semibold leading-snug">
              {crime.label}: {crimeChange.first[0]}년 {fmt(crimeChange.first[1])}건<Arrow />{crimeChange.last[0]}년 {fmt(crimeChange.last[1])}건{" "}
              <span className={crimeChange.pct <= 0 ? "text-jade-ink" : "text-clay-ink"}>({pctText(crimeChange.pct)})</span>
            </p>
            <p className="text-xs text-subtle">{basis === "rate" ? "인구 10만 명당 발생건수 (검찰 집계)" : "발생 건수 (경찰 집계, 인구로 나누지 않음)"}</p>
            <div className="mt-3">
              <StatsChart
                series={[{ id: crime.id, label: crime.label, color: "var(--color-brand-fg)", points: crime.points }]}
                                label={`${crime.label} ${basis === "rate" ? "인구 10만 명당 발생건수" : "발생 건수"} 추이`}
              />
            </div>
            {basis === "rate" && CRIME_NOTES[crime.id] && <p className="mt-2 text-sm leading-6 text-muted">{CRIME_NOTES[crime.id]}</p>}

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[22rem] text-sm">
                <caption className="pb-2 text-left text-xs text-subtle">
                  {dataset[0].points[0][0]}년<Arrow />{dataset[0].points[dataset[0].points.length - 1][0]}년, 한눈에
                </caption>
                <tbody>
                  {(basis === "rate" ? CRIME_RATE.slice(1) : POLICE_COUNTS).map((c) => {
                    const ch = change(c.points);
                    return (
                      <tr key={c.id} className="border-t border-line">
                        <th scope="row" className="py-2 pr-3 text-left font-medium">{c.label}</th>
                        <td className="py-2 pr-3 tabular-nums text-muted">
                          {fmt(ch.first[1])}<Arrow />{fmt(ch.last[1])}
                        </td>
                        <td className={`py-2 text-right font-semibold tabular-nums ${ch.pct <= 0 ? "text-jade-ink" : "text-clay-ink"}`}>
                          <span className="inline-flex items-center justify-end gap-1">
                            {ch.pct <= 0 ? <LuTrendingDown aria-hidden className="size-4" /> : <LuTrendingUp aria-hidden className="size-4" />}
                            {pctText(ch.pct)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs leading-5 text-subtle">
              {basis === "count" && "경찰이 집계한 발생 건수입니다. 검찰 통계와 집계 기준·분류(예: 성폭력과 강간·강제추행, 폭행과 폭력)가 달라 숫자가 서로 다르고, 인구 변화는 반영되지 않았습니다. "}
              {basis === "rate" && "형법범죄 발생건수를 인구 10만 명당으로 환산한 값입니다. "}법이 바뀌거나 신고하는 분위기가 달라지면 숫자도 달라질 수 있어, 숫자의 늘고 줄음이 곧 사회의 안전 정도를 뜻하지는 않습니다.
            </p>
          </>
        ) : tab === "recidivism" ? (
          <>
            <div className="flex flex-wrap gap-2">
              {RECIDIVISM.map((s) => (
                <button key={s.id} type="button" aria-pressed={s.id === recId} onClick={() => setRecId(s.id)} className={chip(s.id === recId)}>
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-lg font-semibold leading-snug">
              {rec.id === "release"
                ? `출소자 ${fmt(recLast[1])}%가 3년 안에 다시 교도소에 들어갔습니다 (${recLast[0]}년).`
                : (
                    <>
                      {rec.label}: {recFirst[0]}년 {fmt(recFirst[1])}%<Arrow />{recLast[0]}년 {fmt(recLast[1])}%
                    </>
                  )}
            </p>
            <p className="mt-1 text-sm text-muted">
              {rec.id === "release" ? `나머지 ${fmt(100 - recLast[1])}%는 3년 안에 돌아오지 않았습니다. ` : ""}
              {rec.help}.
            </p>
            <div className="mt-3">
              <StatsChart series={[{ id: rec.id, label: rec.label, color: "var(--color-brand-fg)", points: rec.points }]} suffix="%" label={`${rec.label} 추이`} />
            </div>
            <p className="mt-4 text-xs leading-5 text-subtle">
              다시 교도소 등에 들어간 경우만 세므로 실제로 다시 죄를 지은 사람 전체와 같지 않습니다. 뉴스에 나오는 전과가 아주 많은 사람의 사례는 눈에 띄는 경우이고, 이 평균을 대표하지 않습니다.
            </p>
          </>
        ) : (
          <>
            {ourCases}
            <p className="mt-4 text-xs leading-5 text-subtle">
              Wishwind가 정리해 공개한 사건 파일의 분포입니다. 우리가 고른 사건이라 실제 범죄 통계나 늘고 줄어드는 흐름을 뜻하지 않습니다.
            </p>
          </>
        )}

        <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-subtle">
          {tab === "ours" ? "출처: Wishwind 사건 기록" : `출처: ${tab === "trend" ? (basis === "rate" ? CRIME_SOURCE : POLICE_SOURCE) : RECIDIVISM_SOURCE}. ${basis === "count" && tab === "trend" ? POLICE_CHECKED_ON : CHECKED_ON} 확인.`}
        </p>
      </div>
    </section>
  );
}
