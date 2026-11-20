"use client";

import { AnimatePresence, motion, useAnimationFrame, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { LuChevronLeft, LuChevronRight, LuPause, LuPlay } from "react-icons/lu";
import type { BoardItem } from "./DepartureBoard";

const INTERVAL_MS = 6000;
/** 자막 띠가 1초에 흐르는 거리(px) */
const TICKER_SPEED = 40;

/** 사건방과 같게 중국(CN)은 기타로 보여 줌 */
const FLAG: Record<string, string> = { KR: "🇰🇷", US: "🇺🇸", GB: "🇬🇧", JP: "🇯🇵", CN: "🌐", OTHER: "🌐" };
const COUNTRY: Record<string, string> = { KR: "한국", US: "미국", GB: "영국", JP: "일본", CN: "기타", OTHER: "기타" };

function ItemLink({ item, className, children }: { item: BoardItem; className?: string; children: React.ReactNode }) {
  return (
    <a
      href={item.href}
      {...(item.external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      className={className}
    >
      {children}
    </a>
  );
}

/** 아래 속보 자막 띠. 같은 목록을 두 번 이어 붙여 끊김 없이 흐르게 함 */
function Ticker({ items, paused, still }: { items: BoardItem[]; paused: boolean; still: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const x = useRef(0);
  const [hover, setHover] = useState(false);

  useAnimationFrame((_, delta) => {
    const el = track.current;
    if (!el || still || paused || hover) return;
    const half = el.scrollWidth / 2;
    x.current -= (delta / 1000) * TICKER_SPEED;
    if (half > 0 && -x.current >= half) x.current += half;
    el.style.transform = `translateX(${x.current}px)`;
  });

  const row = (copy: number) =>
    items.map((item) => (
      <li key={`${copy}-${item.id}`} className="flex shrink-0 items-center gap-2 pr-8">
        <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: item.kindColor }} />
        <ItemLink item={item} className="whitespace-nowrap transition-opacity hover:opacity-70" >
          {item.title}
        </ItemLink>
      </li>
    ));

  return (
    <div
      className="flex items-stretch overflow-hidden border-t border-line text-xs"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="flex shrink-0 items-center bg-[#c46a4b] px-2.5 font-mono font-semibold tracking-wider text-white">
        속보
      </span>
      <div className={`min-w-0 flex-1 py-2 ${still ? "overflow-x-auto" : "overflow-hidden"}`}>
        <div ref={track} className="flex w-max pl-3 text-muted will-change-transform">
          <ul className="flex">{row(0)}</ul>
          {!still && (
            <ul aria-hidden className="flex">
              {row(1)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** 뉴스 헤드라인판: 큰 제목이 몇 초마다 위로 넘어가고, 아래 자막 띠에 나머지 제목이 흐름 */
export function HeadlineBoard({ items, footer }: { items: BoardItem[]; footer?: React.ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [manual, setManual] = useState(false);
  const [clock, setClock] = useState("");
  const count = items.length;

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const tick = () => setClock(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  const running = playing && !hovered && count > 1;
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => {
      setManual(false);
      setIndex((i) => (i + 1) % count);
    }, INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [running, count, index]);

  if (count === 0) return null;
  const item = items[index];
  const go = (delta: number) => {
    setManual(true);
    setIndex((i) => (i + delta + count) % count);
  };
  const rest = [...items.slice(index + 1), ...items.slice(0, index)];

  return (
    <section
      aria-label="헤드라인"
      className="mb-6 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_0_rgb(47_44_40/0.04)]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(false);
      }}
    >
      <div className="px-5 pb-4 pt-4">
        <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-subtle">
          <span className="relative flex size-2">
            {running && !reduced && <span className="absolute inset-0 animate-ping rounded-full bg-[#c4473b]/50" />}
            <span className="relative size-2 rounded-full bg-[#c4473b]" />
          </span>
          <span className="font-semibold text-[#c4473b]">LIVE</span>
          <span>새 소식</span>
          <span className="ml-auto tabular-nums" suppressHydrationWarning>
            {clock && `KST ${clock}`}
          </span>
        </div>

        <div className="relative mt-3 min-h-[5.5rem] overflow-hidden sm:min-h-[5rem]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={item.id}
              initial={reduced ? { opacity: 0 } : { y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { y: -28, opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                <span className="font-semibold" style={{ color: item.kindColor }}>
                  {item.kind}
                </span>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{item.time}</span>
                {item.region && (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      {FLAG[item.region] ?? ""} {COUNTRY[item.region] ?? item.region}
                    </span>
                  </>
                )}
                {item.source && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">{item.source}</span>
                  </>
                )}
              </p>
              <ItemLink
                item={item}
                className="mt-1.5 line-clamp-2 font-serif text-lg font-bold leading-snug text-foreground transition-opacity hover:opacity-70 sm:text-xl"
              >
                {item.title}
              </ItemLink>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-3 flex items-center gap-1 text-subtle">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "헤드라인 넘김 멈추기" : "헤드라인 넘김 다시 시작"}
            className="rounded p-1 hover:bg-line/50"
          >
            {playing ? <LuPause className="size-3.5" /> : <LuPlay className="size-3.5" />}
          </button>
          <button type="button" onClick={() => go(-1)} aria-label="이전 소식" className="rounded p-1 hover:bg-line/50">
            <LuChevronLeft className="size-3.5" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="다음 소식" className="rounded p-1 hover:bg-line/50">
            <LuChevronRight className="size-3.5" />
          </button>
          {/* 진행 표시: 지금 소식 위치 */}
          <div aria-hidden className="ml-2 flex flex-1 gap-1">
            {items.map((it, i) => (
              <span key={it.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                {i === index && (
                  <motion.span
                    key={`${index}-${running}`}
                    className="block h-full bg-foreground/50"
                    initial={{ width: running && !reduced ? "0%" : "100%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: running && !reduced ? INTERVAL_MS / 1000 : 0, ease: "linear" }}
                  />
                )}
                {i < index && <span className="block h-full bg-foreground/25" />}
              </span>
            ))}
          </div>
          <span className="ml-2 font-mono text-[11px] tabular-nums">
            {index + 1}/{count}
          </span>
        </div>
      </div>

      {rest.length > 0 && <Ticker items={rest.length > 1 ? rest : items} paused={false} still={reduced} />}
      {footer}

      {/* 자동으로 넘길 때는 읽지 않고, 직접 넘겼을 때만 새 제목을 읽어 줌 */}
      <p className="sr-only" aria-live={manual ? "polite" : "off"}>
        {`${item.kind}, ${item.title}`}
      </p>
    </section>
  );
}
