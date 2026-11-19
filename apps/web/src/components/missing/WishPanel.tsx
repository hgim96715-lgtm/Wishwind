"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import type { CloudMessage, CloudsResponse, PlaceCloudResult } from "@/lib/missing/types";

const SUGGESTIONS = ["모두 무사히 가족 품으로 돌아오길 바랍니다", "기억하는 사람들이 여기 있어요", "오늘도 길을 밝혀 둘게요"];
const ENDPOINT = "/missing/clouds";
const MAX = 100;

type Notice = { tone: "ok" | "wait" | "warn"; text: string } | null;

/** 정원 전체에 모인 바람개비(응원 메시지). 화면 연출과 패널이 같은 값을 씀 */
export function useWishes() {
  const [data, setData] = useState<CloudsResponse | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    fetch(ENDPOINT, { signal: ac.signal })
      .then((res) => (res.ok ? (res.json() as Promise<CloudsResponse>) : null))
      .then((d) => d && setData(d))
      .catch(() => {});
    return () => ac.abort();
  }, []);
  return [data, setData] as const;
}

/**
 * "바람개비 꽂기": 특정 한 분이 아니라 길 위의 모든 분에게 건네는 응원
 * 한 마디가 바람개비 하나가 되어 정원에 꽂힘. 바람(염원)이 모일수록 다 같이 힘차게 돎
 */
export function WishPanel({
  data,
  setData,
  onClose,
  onPlaced,
  getPosition,
}: {
  data: CloudsResponse | null;
  setData: React.Dispatch<React.SetStateAction<CloudsResponse | null>>;
  onClose: () => void;
  /** 꽂은 바람개비를 정원에서 바로 보여 주기 위해 알림 */
  onPlaced?: (id: string, message: string, placedHere: boolean) => void;
  /** 지금 서 있는 자리 앞 (바람개비를 꽂을 곳). 목록 화면 등에서는 없음 → 정원 안에 꽂힘 */
  getPosition?: () => [number, number] | undefined;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (body.length < 2 || sending) return;
    setSending(true);
    setNotice(null);
    const spot = getPosition?.();
    const position = spot ? { x: Math.round(spot[0] * 100) / 100, z: Math.round(spot[1] * 100) / 100 } : undefined;
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, position }),
      });
      const r = (await res.json()) as PlaceCloudResult & { message?: string };
      if (!res.ok) throw new Error(r.message ?? "바람개비를 꽂지 못했습니다");
      if (r.status === "BLOCKED") {
        setNotice({ tone: "warn", text: r.message });
        return;
      }
      setText("");
      setNotice({ tone: r.status === "PUBLISHED" ? "ok" : "wait", text: r.message });
      setData((d) => d && { ...d, cloudCount: r.cloudCount });
      if (r.cloud) {
        const cloud: CloudMessage = {
          id: r.cloud.id,
          body: r.cloud.body,
          posX: r.cloud.posX ?? null,
          posZ: r.cloud.posZ ?? null,
          createdAt: r.cloud.createdAt,
        };
        setData((d) =>
          d && {
            ...d,
            cloudCount: r.cloudCount,
            clouds: r.status === "PUBLISHED" ? [cloud, ...d.clouds] : d.clouds,
            pending: r.status === "HELD" ? [cloud, ...d.pending] : d.pending,
          },
        );
        onPlaced?.(cloud.id, r.message, cloud.posX != null);
      }
    } catch (err) {
      setNotice({ tone: "warn", text: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const count = data?.cloudCount ?? 0;
  const ms = data?.milestones ?? { sunlight: 10, homePath: 50 };

  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-label="바람개비 꽂기"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="absolute inset-x-4 bottom-4 z-30 mx-auto max-h-[78dvh] max-w-md overflow-y-auto rounded-3xl border border-[#f1dfc4] bg-[#fffaf2]/95 p-6 shadow-[0_20px_60px_rgb(120_90_50/0.25)] backdrop-blur md:bottom-8"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-4 right-4 rounded-full p-1.5 text-subtle transition-colors hover:bg-[#f3e6d2] hover:text-foreground"
      >
        <LuX aria-hidden className="size-5" />
      </button>
      <h2 className="text-lg font-semibold">바람개비 꽂기</h2>
      <p className="mt-1 text-sm text-muted">
        길 위의 모든 분에게 응원 한 마디를 건네 주세요. 지금 서 있는 자리에 바람개비가 꽂히고, 바람이 모일수록 언덕의 바람개비가 다 같이 힘차게 돕니다.
      </p>
      <p className="mt-3 text-xs text-subtle">정원의 바람개비 {count}개</p>
      <Progress count={count} ms={ms} />

      <form onSubmit={submit} className="mt-3">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setText(s)}
              className="rounded-full bg-[#f3e6d2] px-3 py-1 text-xs text-[#6b5a46] transition-colors hover:bg-[#fff4e3]"
            >
              {s}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="cloud-message">
          응원 메시지
        </label>
        <textarea
          id="cloud-message"
          value={text}
          maxLength={MAX}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          placeholder="따뜻한 한 마디를 남겨 주세요"
          className="mt-3 w-full resize-none rounded-xl border border-[#ecdcc4] bg-white px-3 py-2 text-sm outline-none focus:border-[#e9a94f]"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-subtle">
            {text.length}/{MAX}
          </span>
          <button
            type="submit"
            disabled={sending || text.trim().length < 2}
            className="shrink-0 rounded-full bg-[#e9a94f] px-4 py-1.5 whitespace-nowrap text-sm font-medium text-white shadow-sm transition-opacity disabled:opacity-50"
          >
            {sending ? "꽂는 중…" : "꽂기"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-subtle">목격 정보는 등불 카드의 제보 버튼으로 알려 주세요.</p>
        {notice && (
          <p
            role="status"
            className={`mt-2 text-xs ${notice.tone === "warn" ? "text-[#b5563c]" : notice.tone === "wait" ? "text-[#7a6650]" : "text-[#4f8a7a]"}`}
          >
            {notice.text}
          </p>
        )}
      </form>

      {data && (data.pending.length > 0 || data.clouds.length > 0) && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="정원의 바람개비">
          <AnimatePresence initial={false}>
            {data.pending.map((c) => (
              <Bubble key={c.id} body={c.body} pending />
            ))}
            {data.clouds.map((c) => (
              <Bubble key={c.id} body={c.body} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </motion.section>
  );
}

function Progress({ count, ms }: { count: number; ms: { sunlight: number; homePath: number } }) {
  const pct = Math.min(100, (count / ms.homePath) * 100);
  const label =
    count >= ms.homePath
      ? "등대에 불이 켜졌습니다 · 집으로 가는 길이 밝아졌습니다"
      : count >= ms.sunlight
        ? `정원에 햇살이 들었습니다 · 등대가 켜질 때까지 ${ms.homePath - count}개`
        : `정원에 햇살이 들 때까지 ${ms.sunlight - count}개`;
  return (
    <div className="mt-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-[#f3e6d2]">
        <div className="h-full rounded-full bg-[#f1c27d] transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-subtle">{label}</p>
    </div>
  );
}

function Bubble({ body, pending }: { body: string; pending?: boolean }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl px-3 py-1.5 text-xs ${pending ? "border border-dashed border-[#e2cfb1] text-subtle" : "bg-[#f6eee2] text-[#5b4d3c]"}`}
    >
      {body}
      {pending && <span className="ml-1 text-[10px]">(확인 중)</span>}
    </motion.li>
  );
}
