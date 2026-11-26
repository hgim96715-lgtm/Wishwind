"use client";

import { useEffect, useState } from "react";
import { inputClass } from "@/components/admin/ui";

const KEY = "wishwind-growth-v1";
type State = { followers: string; visits: string; donation: string; notes: string; done: Record<string, boolean> };
const EMPTY: State = { followers: "", visits: "", donation: "", notes: "", done: {} };

/** 목표 숫자·점검 체크·메모. 관리자 한 명이 쓰는 용도라 이 브라우저(localStorage)에만 저장함 */
export function GrowthNotes({ checklist }: { checklist: string[] }) {
  const [s, setS] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...EMPTY, ...(JSON.parse(raw) as Partial<State>) });
    } catch {}
    setReady(true);
  }, []);

  const update = (patch: Partial<State>) => {
    const next = { ...s, ...patch };
    setS(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  return (
    <div className="space-y-5" aria-busy={!ready}>
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["followers", "인스타 팔로워 목표", "예: 300"],
            ["visits", "월 방문자 목표", "예: 100"],
            ["donation", "월 후원 목표 (원)", "예: 30000"],
          ] as const
        ).map(([k, label, ph]) => (
          <label key={k} className="block text-sm">
            <span className="text-xs text-subtle">{label}</span>
            <input value={s[k]} onChange={(e) => update({ [k]: e.target.value })} inputMode="numeric" placeholder={ph} className={`${inputClass} mt-1`} />
          </label>
        ))}
      </div>
      <ul className="space-y-2">
        {checklist.map((item) => (
          <li key={item}>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={!!s.done[item]} onChange={(e) => update({ done: { ...s.done, [item]: e.target.checked } })} className="mt-1" />
              <span className={s.done[item] ? "text-subtle line-through" : ""}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
      <label className="block text-sm">
        <span className="text-xs text-subtle">분석 메모 (이번 주 배운 것, 다음에 바꿀 것)</span>
        <textarea value={s.notes} onChange={(e) => update({ notes: e.target.value })} rows={6} className={`${inputClass} mt-1`} />
      </label>
      <p className="text-xs text-subtle">이 브라우저에만 저장됩니다. 다른 기기와는 공유되지 않습니다.</p>
    </div>
  );
}
