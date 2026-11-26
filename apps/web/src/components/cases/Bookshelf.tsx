"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { LuDices, LuLayoutList, LuLibrary } from "react-icons/lu";
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  COUNTRY_LABEL,
  COUNTRY_ORDER,
  caseRoomCountry,
  caseStamp,
  formatCaseDate,
} from "@/lib/cases/labels";
import type { CaseListItem, Country } from "@/lib/cases/types";
import { FileSpine } from "./FileSpine";

/** 국가별로 묶음. 정렬은 COUNTRY_ORDER, 같은 책장 안은 API 순서(최신 발생일순) 유지 */
function groupByCountry(items: CaseListItem[]) {
  const map = new Map<Country, CaseListItem[]>();
  for (const item of items) {
    const country = caseRoomCountry(item.country);
    const list = map.get(country) ?? [];
    list.push(item);
    map.set(country, list);
  }
  return [...map.entries()].sort(
    ([a], [b]) => COUNTRY_ORDER.indexOf(a) - COUNTRY_ORDER.indexOf(b),
  );
}

function Shelves({ items }: { items: CaseListItem[] }) {
  let fileNo = 0;
  return (
    <div className="space-y-12">
      {groupByCountry(items).map(([country, cases]) => (
        <section key={country} aria-labelledby={`shelf-${country}`}>
          {/* 책장 이름표 */}
          <div className="mb-3 flex items-end justify-between px-1">
            <h2
              id={`shelf-${country}`}
              className="inline-flex items-center gap-2 rounded-md border border-[#8a6a4a]/30 bg-[#f6ecdc] px-3 py-1 text-sm font-bold shadow-[0_1px_0_rgb(47_44_40/0.08)]"
            >
              {COUNTRY_LABEL[country]}
            </h2>
            <span className="font-mono text-xs text-subtle">
              {cases.length} FILES
            </span>
          </div>

          {/* 책장 본체: 뒷판 + 선반. 모바일에서는 가로 스크롤 */}
          <div className="rounded-xl border-x-[10px] border-t-[10px] border-[#b08b66] bg-[#e2d2b8] shadow-[inset_0_10px_18px_rgb(91_70_52/0.28)]">
            <ul className="flex snap-x items-end gap-1.5 overflow-x-auto px-4 pt-6 [scrollbar-width:thin]">
              {cases.map((item) => (
                <li key={item.id} className="snap-start">
                  <FileSpine item={item} fileNo={++fileNo} />
                </li>
              ))}
            </ul>
            {/* 선반 판 */}
            <div
              aria-hidden
              className="h-4 rounded-b-md bg-gradient-to-b from-[#c09a73] to-[#a07b57] shadow-[0_6px_12px_rgb(47_44_40/0.25)]"
            />
          </div>
        </section>
      ))}
    </div>
  );
}

const FILTERS = [
  { id: "all", label: "전체", test: () => true },
  { id: "unsolved", label: "미제", test: (i: CaseListItem) => i.status === "UNSOLVED" },
  { id: "missing", label: "실종", test: (i: CaseListItem) => i.category === "MISSING" || i.category === "KIDNAPPING" },
  { id: "kr", label: "한국", test: (i: CaseListItem) => i.country === "KR" },
] as const;

/** 오늘(한국 날짜) 기준으로 날마다 바뀌는 추천 파일 3건. 미제 사건을 먼저 고름 */
function recommended(items: CaseListItem[]) {
  const pool = items.filter((i) => i.status === "UNSOLVED");
  const source = pool.length >= 3 ? pool : items;
  if (source.length <= 3) return source;
  const day = Math.floor((Date.now() + 9 * 3_600_000) / 86_400_000);
  return [0, 1, 2].map((k) => source[(day * 3 + k) % source.length]);
}

function fileHref(params: URLSearchParams, slug: string) {
  const next = new URLSearchParams(params.toString());
  next.set("file", slug);
  return `/cases?${next.toString()}`;
}

export function Bookshelf({ items }: { items: CaseListItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [view, setView] = useState<"shelf" | "list">("shelf");
  const shown = useMemo(() => items.filter(FILTERS.find((f) => f.id === filter)!.test), [items, filter]);
  const picks = useMemo(() => recommended(items), [items]);

  const openRandom = () => {
    const pool = shown.length > 0 ? shown : items;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) router.push(fileHref(searchParams, pick.slug), { scroll: false });
  };

  return (
    <div>
      {picks.length > 0 && (
        <section aria-labelledby="picks-title" className="mb-8">
          <h2 id="picks-title" className="mb-3 text-sm font-semibold uppercase tracking-widest text-subtle">
            오늘의 추천 파일
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {picks.map((item) => {
              const stamp = caseStamp(item);
              return (
                <li key={item.id}>
                  <Link
                    href={fileHref(searchParams, item.slug)}
                    scroll={false}
                    className="group block h-full rounded-xl border border-line bg-surface p-4 transition-all hover:-translate-y-1 hover:shadow-md"
                  >
                    <span className="flex items-center gap-2 text-xs">
                      <span className="size-2 rounded-full" style={{ background: CATEGORY_COLOR[item.category] }} />
                      <span className="text-subtle">{CATEGORY_LABEL[item.category]}</span>
                      <span className="font-mono font-bold" style={{ color: stamp.color }}>{stamp.label}</span>
                    </span>
                    <span className="mt-2 block font-semibold leading-snug">{item.title}</span>
                    <span className="mt-1 line-clamp-2 block text-sm leading-6 text-muted">{item.summary}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              filter === f.id ? "border-foreground bg-foreground text-surface" : "border-line bg-surface hover:border-foreground/40"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={openRandom}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm transition-colors hover:border-foreground/40"
          >
            <LuDices aria-hidden className="size-4" />
            아무 파일 열기
          </button>
          <button
            type="button"
            onClick={() => setView(view === "shelf" ? "list" : "shelf")}
            aria-label={view === "shelf" ? "목록으로 보기" : "책장으로 보기"}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm transition-colors hover:border-foreground/40"
          >
            {view === "shelf" ? <LuLayoutList aria-hidden className="size-4" /> : <LuLibrary aria-hidden className="size-4" />}
            {view === "shelf" ? "목록" : "책장"}
          </button>
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-subtle">
          이 조건에 맞는 파일이 없습니다.
        </p>
      ) : view === "shelf" ? (
        <Shelves items={shown} />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {shown.map((item) => {
            const stamp = caseStamp(item);
            return (
              <li key={item.id}>
                <Link
                  href={fileHref(searchParams, item.slug)}
                  scroll={false}
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-background"
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[item.category] }} />
                  <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                  <span className="hidden text-xs text-subtle sm:inline">{COUNTRY_LABEL[caseRoomCountry(item.country)]}</span>
                  <span className="text-xs text-subtle">{formatCaseDate(item.occurredAt, "YEAR")}</span>
                  <span className="font-mono text-xs font-bold" style={{ color: stamp.color }}>{stamp.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
