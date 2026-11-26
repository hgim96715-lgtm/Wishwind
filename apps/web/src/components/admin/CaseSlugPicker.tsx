"use client";

import { useState } from "react";
import { inputClass } from "@/components/admin/ui";

export interface CaseOption {
  slug: string;
  title: string;
}

/** 제목으로 검색해서 사건을 고르는 칸. 고른 사건의 슬러그가 caseSlug로 전송됨 */
export function CaseSlugPicker({ cases, initial }: { cases: CaseOption[]; initial?: string | null }) {
  const [slug, setSlug] = useState(initial ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = cases.find((c) => c.slug === slug);
  const q = query.trim().toLowerCase();
  const matches = q ? cases.filter((c) => c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)).slice(0, 8) : [];

  return (
    <div className="relative">
      <input type="hidden" name="caseSlug" value={slug} />
      {slug ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm">
          <span className="min-w-0 truncate">{selected?.title ?? slug}</span>
          <button type="button" onClick={() => setSlug("")} className="shrink-0 text-xs text-subtle hover:text-clay-ink">
            바꾸기
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="사건 제목으로 검색"
            className={inputClass}
          />
          {open && q && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-line bg-surface shadow-lg">
              {matches.length === 0 ? (
                <li className="px-3 py-2 text-sm text-subtle">공개된 사건 중에 없습니다.</li>
              ) : (
                matches.map((c) => (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSlug(c.slug);
                        setQuery("");
                        setOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5"
                    >
                      {c.title}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
