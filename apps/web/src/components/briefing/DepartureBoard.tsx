"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuPause, LuPlay } from "react-icons/lu";

export interface BoardItem {
  id: string;
  /** 안내판 왼쪽 칸 (예: "14:05") */
  time: string;
  /** 구분 글자 (새 소식·사건 변경 등) */
  kind: string;
  kindColor: string;
  title: string;
  /** 오른쪽 칸 (예: "KR") */
  region: string;
  /** 출처(언론사 등). 헤드라인판에서만 씀 */
  source?: string;
  href: string;
  external: boolean;
}

const ROWS = 3;
const INTERVAL_MS = 6000;
const CELL_EM = 1.12;
const FLIP_MS = 55;

const HANGUL = "가나다라마바사아자차카타파하강남동서북건실종수사판결";
const DIGITS = "0123456789";
const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomGlyph(target: string) {
  const pool = /[0-9]/.test(target) ? DIGITS : /[A-Za-z]/.test(target) ? LATIN : HANGUL;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 플랩 한 칸. 글자가 바뀌면 임의 글자 몇 개를 거쳐 최종 글자에서 멈춤 */
function FlapCell({ char, delay, still }: { char: string; delay: number; still: boolean }) {
  const [shown, setShown] = useState(char);
  const [flip, setFlip] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current || still) {
      first.current = false;
      setShown(char);
      return;
    }
    const timers: number[] = [];
    const steps = char === " " ? 1 : 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < steps; i++) {
      timers.push(
        window.setTimeout(() => {
          setShown(randomGlyph(char));
          setFlip((f) => f + 1);
        }, delay + i * FLIP_MS),
      );
    }
    timers.push(
      window.setTimeout(() => {
        setShown(char);
        setFlip((f) => f + 1);
      }, delay + steps * FLIP_MS),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [char, delay, still]);

  return (
    <span
      className="relative inline-flex h-[1.75em] shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-[linear-gradient(#363d50_50%,#2f3546_50%)] text-[#f3ead8] [perspective:200px]"
      style={{ width: `${CELL_EM}em` }}
    >
      <motion.span
        key={flip}
        initial={still || flip === 0 ? false : { rotateX: -80, opacity: 0.4 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ duration: FLIP_MS / 1000, ease: "easeOut" }}
        className="block origin-top leading-none"
      >
        {shown === " " ? " " : shown}
      </motion.span>
      {/* 플랩 가운데 접히는 선 */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-px bg-black/35" />
    </span>
  );
}

function FlapText({ text, length, baseDelay, still }: { text: string; length: number; baseDelay: number; still: boolean }) {
  const chars = Array.from(text);
  const fitted = chars.length > length ? [...chars.slice(0, Math.max(0, length - 1)), "…"] : chars;
  const padded = [...fitted, ...Array(Math.max(0, length - fitted.length)).fill(" ")];
  return (
    <span aria-hidden className="flex gap-[2px]">
      {padded.map((c, i) => (
        // 칸 위치가 곧 정체성이라 index를 key로 씀
        <FlapCell key={i} char={c} delay={baseDelay + Math.min(i, 28) * 22} still={still} />
      ))}
    </span>
  );
}

/** 역·공항 출발 안내판처럼 브리핑을 몇 초마다 넘겨 보여 주는 판 */
export function DepartureBoard({ items }: { items: BoardItem[] }) {
  const reduced = useReducedMotion() ?? false;
  const pages = Math.max(1, Math.ceil(items.length / ROWS));
  const [page, setPage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [manual, setManual] = useState(false);
  const [titleCells, setTitleCells] = useState(22);
  const titleRef = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState("");

  // 제목 칸 수는 화면 너비에 맞춰 계산 (모바일에서 넘치지 않도록)
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const measure = () => {
      const fontPx = parseFloat(getComputedStyle(el).fontSize) || 14;
      const cell = CELL_EM * fontPx + 2;
      setTitleCells(Math.max(6, Math.floor((el.clientWidth + 2) / cell) - 1));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false });
    const tick = () => setClock(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  const running = playing && !hovered && pages > 1;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setManual(false);
      setPage((p) => (p + 1) % pages);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [running, pages]);

  const go = useCallback(
    (delta: number) => {
      setManual(true);
      setPage((p) => (p + delta + pages) % pages);
    },
    [pages],
  );

  if (items.length === 0) return null;
  const visible = Array.from({ length: ROWS }, (_, i) => items[(page % pages) * ROWS + i] ?? null);

  return (
    <section
      aria-label="브리핑 안내판"
      className="mb-6 rounded-2xl border border-[#d6cbb8] bg-[#e4dacb] p-2.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] sm:p-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(false);
      }}
    >
      <div className="relative rounded-xl bg-[#262b39] px-3 pb-3 pt-2.5 sm:px-4">
        {/* 나사 장식 */}
        {["left-1.5 top-1.5", "right-1.5 top-1.5", "left-1.5 bottom-1.5", "right-1.5 bottom-1.5"].map((pos) => (
          <span key={pos} aria-hidden className={`absolute ${pos} size-1.5 rounded-full bg-[#c9bda8]/70`} />
        ))}

        <div className="mb-2.5 flex items-center gap-3 border-b border-white/10 pb-2 font-mono text-[11px] tracking-[0.18em] text-ink-faint">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={`size-1.5 rounded-full bg-[#7fb7a8] ${running && !reduced ? "animate-pulse" : ""}`} />
            BRIEFING BOARD
          </span>
          <span className="hidden text-ink-faint/60 sm:inline">시각 · 구분 · 소식 · 지역</span>
          <span className="ml-auto tabular-nums" suppressHydrationWarning>
            {clock && `KST ${clock}`}
          </span>
        </div>

        <ul className="space-y-1.5 text-[13px] sm:text-sm">
          {visible.map((item, row) => {
            const baseDelay = row * 140;
            const inner = (
              <>
                <span className="hidden sm:block">
                  <FlapText text={item?.time ?? ""} length={5} baseDelay={baseDelay} still={reduced} />
                </span>
                <span className="flex w-[4.6em] shrink-0 items-center gap-1.5 text-xs text-[#e8dfcd]">
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item?.kindColor ?? "transparent" }} />
                  <span className="truncate">{item?.kind ?? ""}</span>
                </span>
                <div ref={row === 0 ? titleRef : undefined} className="min-w-0 flex-1 overflow-hidden">
                  <FlapText text={item?.title ?? ""} length={titleCells} baseDelay={baseDelay + 60} still={reduced} />
                </div>
                <FlapText text={item?.region ?? ""} length={2} baseDelay={baseDelay + 120} still={reduced} />
              </>
            );
            return (
              <li key={row}>
                {item ? (
                  <a
                    href={item.href}
                    {...(item.external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                    aria-label={`${item.kind}: ${item.title}`}
                    className="flex items-center gap-2 rounded-md outline-offset-2 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#7fb7a8] sm:gap-3"
                  >
                    {inner}
                  </a>
                ) : (
                  <div aria-hidden className="flex items-center gap-2 opacity-60 sm:gap-3">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-ink-faint">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "안내판 넘김 멈추기" : "안내판 넘김 다시 시작"}
            className="rounded-md p-1 hover:bg-white/10"
          >
            {playing ? <LuPause className="size-3.5" /> : <LuPlay className="size-3.5" />}
          </button>
          <button type="button" onClick={() => go(-1)} aria-label="이전 소식" className="rounded-md p-1 hover:bg-white/10">
            <LuChevronLeft className="size-3.5" />
          </button>
          <span className="tabular-nums">
            {(page % pages) + 1} / {pages}
          </span>
          <button type="button" onClick={() => go(1)} aria-label="다음 소식" className="rounded-md p-1 hover:bg-white/10">
            <LuChevronRight className="size-3.5" />
          </button>
          <span className="ml-auto text-ink-faint/60">{hovered ? "잠시 멈춤" : "눌러서 원문 보기"}</span>
        </div>

        {/* 자동으로 넘길 때는 읽지 않고, 직접 넘겼을 때만 새 목록을 읽어 줌 */}
        <p className="sr-only" aria-live={manual ? "polite" : "off"}>
          {visible
            .filter((i): i is BoardItem => i !== null)
            .map((i) => `${i.kind}, ${i.title}`)
            .join(". ")}
        </p>
      </div>
    </section>
  );
}
