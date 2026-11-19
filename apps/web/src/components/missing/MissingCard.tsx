"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { LuExternalLink, LuMapPin, LuX } from "react-icons/lu";
import { formatMissingDate } from "@/lib/missing/regions";
import type { MissingDetail } from "@/lib/missing/types";

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; data: MissingDetail };

/** 등불을 눌렀을 때 펼쳐지는 따뜻한 카드 */
export function MissingCard({
  id,
  regionLabel,
  onClose,
}: {
  id: string;
  regionLabel: string;
  onClose: () => void;
}) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/missing/person/${encodeURIComponent(id)}`, { signal: ac.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? "정보를 불러오지 못했습니다");
        }
        return (await res.json()) as MissingDetail;
      })
      .then((data) => setLoad({ state: "ready", data }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setLoad({ state: "error", message: e.message });
      });
    return () => ac.abort();
  }, [id]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="실종자 정보"
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
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

      {load.state === "loading" && <p className="py-10 text-center text-muted">등불을 밝히고 있습니다…</p>}
      {load.state === "error" && <p className="py-10 text-center text-muted">{load.message}</p>}
      {load.state === "ready" && <CardBody data={load.data} regionLabel={regionLabel} />}
    </motion.div>
  );
}

type Translation =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; text: string; showKo: boolean };

function CardBody({
  data,
  regionLabel,
}: {
  data: MissingDetail;
  regionLabel: string;
}) {
  const [more, setMore] = useState(false);
  const [tr, setTr] = useState<Translation>({ state: "idle" });

  const translate = async () => {
    if (tr.state === "ready") return setTr({ ...tr, showKo: !tr.showKo });
    setTr({ state: "loading" });
    try {
      const res = await fetch(`/missing/person/${encodeURIComponent(data.id)}/translation`);
      const body = (await res.json()) as { descriptionKo?: string; message?: string };
      if (!res.ok || !body.descriptionKo) throw new Error(body.message ?? "번역하지 못했습니다");
      setTr({ state: "ready", text: body.descriptionKo, showKo: true });
      setMore(true);
    } catch (e) {
      setTr({ state: "error", message: (e as Error).message });
    }
  };
  const showKo = tr.state === "ready" && tr.showKo;
  return (
    <div>
      <p className="text-xs tracking-wide text-subtle">{regionLabel}</p>
      <div className="mt-3 flex gap-4">
        {data.photoUrl && (
          // 외부(FBI) 원본 사진을 그대로 보여줌: 가공·저장하지 않음
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.photoUrl}
            alt={`${data.name}님 사진`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-36 w-28 shrink-0 rounded-2xl object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{data.name}</h2>
          <p className="mt-1 text-sm text-muted">{formatMissingDate(data.missingDate)} 실종</p>
          {data.lastSeenPlace && (
            <p className="mt-2 flex items-start gap-1 text-sm">
              <LuMapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-[#c9964f]" />
              마지막으로 목격된 곳: {data.lastSeenPlace}
            </p>
          )}
        </div>
      </div>

      {data.appearance && (
        <section className="mt-5">
          <h3 className="text-sm font-semibold">인상착의</h3>
          <p className="mt-1 whitespace-pre-line text-sm text-muted">{data.appearance}</p>
        </section>
      )}

      {data.description && (
        <section className="mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">자세한 내용 {showKo ? "(번역)" : "(원문)"}</h3>
            {data.source === "FBI" && (
              <button
                type="button"
                onClick={translate}
                disabled={tr.state === "loading"}
                className="rounded-full bg-[#f3e6d2] px-3 py-1 text-xs text-[#6b5a46] transition-colors hover:bg-[#ecdabf] disabled:opacity-60"
              >
                {tr.state === "loading" ? "번역 중…" : showKo ? "원문 보기" : "번역하기"}
              </button>
            )}
          </div>
          <p
            lang={showKo ? "ko" : "en"}
            className={`mt-1 whitespace-pre-line text-sm text-muted ${more ? "" : "line-clamp-4"}`}
          >
            {showKo && tr.state === "ready" ? tr.text : data.description}
          </p>
          {showKo && <p className="mt-1 text-[11px] text-subtle">AI 번역입니다. 정확한 내용은 원문을 확인해 주세요.</p>}
          {tr.state === "error" && <p className="mt-1 text-xs text-[#b5563c]">{tr.message}</p>}
          <button type="button" onClick={() => setMore((v) => !v)} className="mt-1 text-xs text-subtle underline">
            {more ? "접기" : "더 보기"}
          </button>
        </section>
      )}

      <p className="mt-6 text-center text-sm font-medium text-[#6b5a46]">
        이 분을 보셨나요?
      </p>
      <a
        href={data.tip.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-[#e9a94f] px-5 py-3 font-medium text-white transition-colors hover:bg-[#d9963b]"
      >
        {data.tip.label}
        <LuExternalLink aria-hidden className="size-4" />
      </a>
      <p className="mt-2 text-center text-xs text-subtle">
        작은 기억도 큰 도움이 됩니다. 목격 정보는 공식 창구로 알려 주세요.
      </p>

      <p className="mt-5 border-t border-[#f1dfc4] pt-3 text-xs text-subtle">
        자료 출처:{" "}
        <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="underline">
          {data.sourceLabel}
        </a>
      </p>
    </div>
  );
}
