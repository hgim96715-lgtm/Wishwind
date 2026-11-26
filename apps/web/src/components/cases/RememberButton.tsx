"use client";

import { useEffect, useState } from "react";
import { LuHeart } from "react-icons/lu";

/** 개발 모드의 '다른 사람으로 보기' 중에는 그 사람만의 저장 칸을 써서 내가 누른 하트가 비치지 않게 함 */
const storageKey = (slug: string) => {
  const viewer = typeof document === "undefined" ? undefined : document.cookie.match(/(?:^|; )dev_viewing_as_other=([^;]+)/)?.[1];
  return `wishwind:remember:${slug}${viewer ? `:${viewer}` : ""}`;
};

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

  /** 누르면 +1, 다시 누르면 취소(-1). 연속으로 눌러도 한 번에 하나씩만 처리 */
  async function press() {
    if (busy) return;
    setBusy(true);
    const next = !done;
    setDone(next);
    setCount((c) => Math.max(0, (c ?? 0) + (next ? 1 : -1)));
    try {
      if (next) localStorage.setItem(storageKey(slug), "1");
      else localStorage.removeItem(storageKey(slug));
    } catch {}
    try {
      const res = await fetch(url, { method: next ? "POST" : "DELETE" });
      const d = (await res.json().catch(() => null)) as { count?: number } | null;
      if (typeof d?.count === "number") setCount(d.count);
    } catch {
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 flex flex-col items-center gap-2 rounded-xl border border-line bg-surface/70 px-6 py-6 text-center">
      <p className="text-sm text-muted">이 사건을 잊지 않겠다는 마음을 남겨 주세요. 로그인 없이 한 번이면 됩니다. 다시 누르면 취소돼요.</p>
      <button
        type="button"
        onClick={press}
        aria-pressed={done}
        className="inline-flex items-center gap-2 rounded-full bg-jade-deep px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-70"
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
