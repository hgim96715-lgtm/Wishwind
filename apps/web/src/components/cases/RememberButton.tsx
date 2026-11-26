"use client";

import { useEffect, useState } from "react";
import { LuHeart } from "react-icons/lu";

const storageKey = (slug: string) => `wishwind:remember:${slug}`;

/** 로그인 없이 한 번 누르면 +1. 같은 브라우저는 localStorage로, 서버는 일별 해시로 중복을 막음 */
export function RememberButton({ slug }: { slug: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const url = `/api/files/case/${encodeURIComponent(slug)}/remember`;

  useEffect(() => {
    try {
      setDone(localStorage.getItem(storageKey(slug)) === "1");
    } catch {}
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { count?: number } | null) => typeof d?.count === "number" && setCount(d.count))
      .catch(() => null);
    return () => ctrl.abort();
  }, [slug, url]);

  async function press() {
    if (done || busy) return;
    setBusy(true);
    setDone(true);
    setCount((c) => (c ?? 0) + 1);
    try {
      localStorage.setItem(storageKey(slug), "1");
    } catch {}
    try {
      const res = await fetch(url, { method: "POST" });
      const d = (await res.json().catch(() => null)) as { count?: number } | null;
      if (typeof d?.count === "number") setCount(d.count);
    } catch {
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 flex flex-col items-center gap-2 rounded-xl border border-line bg-surface/70 px-6 py-6 text-center">
      <p className="text-sm text-muted">이 사건을 잊지 않겠다는 마음을 남겨 주세요. 로그인 없이 한 번이면 됩니다.</p>
      <button
        type="button"
        onClick={press}
        disabled={done}
        aria-pressed={done}
        className="inline-flex items-center gap-2 rounded-full bg-jade-deep px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-default disabled:opacity-70"
      >
        <LuHeart aria-hidden className={`size-4 ${done ? "fill-current" : ""}`} />
        {done ? "함께 기억하고 있습니다" : "함께 기억하기"}
      </button>
      {count !== null && (
        <p className="text-xs text-subtle tabular-nums">{count.toLocaleString("ko-KR")}명이 함께 기억합니다</p>
      )}
    </section>
  );
}
