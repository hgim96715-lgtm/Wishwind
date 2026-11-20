"use client";

import { useState, type ReactNode } from "react";

/** 처음에는 최근 몇 개만 보여 주고, 「더 보기」로 나머지를 펼침 (기록이 많아져도 페이지가 끝없이 길어지지 않게) */
export function FoldList({ items, initial = 3 }: { items: ReactNode[]; initial?: number }) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, initial);
  const rest = items.length - initial;
  return (
    <>
      <ul className="mt-3 flex flex-col gap-2">{shown}</ul>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 w-full rounded-xl border border-dashed border-line py-2 text-sm text-muted transition-colors hover:bg-white hover:text-foreground"
        >
          {open ? "접기" : `${rest.toLocaleString("ko-KR")}개 더 보기`}
        </button>
      )}
    </>
  );
}
