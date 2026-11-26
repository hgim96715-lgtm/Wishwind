"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LuClapperboard, LuDices, LuLayoutList, LuLibrary } from "react-icons/lu";
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  COUNTRY_LABEL,
  COUNTRY_ORDER,
  caseRoomCountry,
  caseStamp,
  formatCaseDate,
} from "@/lib/cases/labels";
import type { CaseListItem, Country, MediaCaseItem, RelatedKind } from "@/lib/cases/types";
import { FileSpine } from "./FileSpine";
import { SheetPending } from "./SheetPending";

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

/** 오늘(한국 날짜) 기준으로 날마다 바뀌는 추천 파일 3건. 미제 사건을 먼저 고름 */
function recommended(items: CaseListItem[], dayIndex: number, pinnedSlugs: string[]) {
  // 관리실에서 고정한 사건을 먼저, 남는 칸은 날짜로 돌아가며 채움
  const pinned = pinnedSlugs.map((slug) => items.find((i) => i.slug === slug)).filter((i): i is CaseListItem => !!i).slice(0, 3);
  const rest = items.filter((i) => !pinned.includes(i));
  const pool = rest.filter((i) => i.status === "UNSOLVED");
  const source = pool.length >= 3 - pinned.length ? pool : rest;
  const need = 3 - pinned.length;
  const filled = source.length <= need ? source : Array.from({ length: need }, (_, k) => source[(dayIndex * 3 + k) % source.length]);
  return [...pinned, ...filled];
}

function fileHref(params: URLSearchParams, slug: string) {
  const next = new URLSearchParams(params.toString());
  next.set("file", slug);
  return `/cases?${next.toString()}`;
}

const MEDIA_KIND: Record<RelatedKind, string> = {
  DOCUMENTARY: "다큐멘터리",
  TV_PROGRAM: "방송",
  YOUTUBE: "유튜브",
  PODCAST: "팟캐스트",
  MOVIE: "영화",
  SERIES: "시리즈",
  BOOK: "책",
};

export function Bookshelf({
  items,
  pinnedSlugs = [],
  mediaItems = [],
}: {
  items: CaseListItem[];
  pinnedSlugs?: string[];
  /** 오늘의 영상 연결 사건 (최대 1건). 있으면 '오늘의 사건 파일' 자리에 먼저 보여 줌 */
  mediaItems?: MediaCaseItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"shelf" | "list">("shelf");
  // 날짜는 브라우저에서 정해 prerender 때 시각 값이 굳지 않게 함 (그 전에는 추천 칸을 비움)
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  useEffect(() => setDayIndex(Math.floor((Date.now() + 9 * 3_600_000) / 86_400_000)), []);
  const picks = useMemo(() => (dayIndex === null ? [] : recommended(items, dayIndex, pinnedSlugs)), [items, dayIndex, pinnedSlugs]);

  // 오늘의 한 건은 서버가 날짜로 골라 보냄 (하루 동안 같은 사건)
  const todayMedia = mediaItems[0] ?? null;

  const openRandom = () => {
    const pick = items[Math.floor(Math.random() * items.length)];
    if (pick) router.push(fileHref(searchParams, pick.slug), { scroll: false });
  };

  return (
    <div>
      {mediaItems.length > 0 && (
        <section aria-labelledby="media-title">
          <h2 id="media-title" className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-subtle">
            <LuClapperboard aria-hidden className="size-4 text-brand-fg" />
            영상으로 먼저 본 그 사건
          </h2>
          <div>
            {todayMedia && (
              <Link
                href={fileHref(searchParams, todayMedia.slug)}
                scroll={false}
                className="group block rounded-2xl border border-line bg-surface p-4 transition-all hover:-translate-y-1 hover:shadow-md sm:p-5"
              >
                <span className="inline-block whitespace-nowrap rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-fg">
                  {todayMedia.media[0].platform} · {MEDIA_KIND[todayMedia.media[0].kind]}
                </span>
                <span className="mt-2 line-clamp-2 block text-sm font-semibold leading-6">「{todayMedia.media[0].title}」</span>
                <span className="mt-3 block border-t border-line pt-3 text-xs text-muted">이 작품이 다룬 사건</span>
                <span className="mt-2 block text-lg font-semibold leading-snug">{todayMedia.title}</span>
                <span className="mt-1 line-clamp-2 block text-sm leading-6 text-muted">{todayMedia.summary}</span>
                <SheetPending />
              </Link>
            )}
          </div>
        </section>
      )}

      {mediaItems.length === 0 && picks.length > 0 && (
        <section aria-labelledby="picks-title">
          <h2 id="picks-title" className="mb-3 text-sm font-semibold uppercase tracking-widest text-subtle">
            오늘의 사건 파일
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
                    <SheetPending />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-10 mb-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-5">
        <p className="text-sm font-semibold text-subtle">전체 사건 파일 {items.length}건</p>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={openRandom}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm transition-colors hover:border-foreground/40"
          >
            <LuDices aria-hidden className="size-4" />
            랜덤 파일 열기
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

      {view === "shelf" ? (
        <Shelves items={items} />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {items.map((item) => {
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
                  <SheetPending />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
