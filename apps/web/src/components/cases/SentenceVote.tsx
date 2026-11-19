"use client";

import { useEffect, useState } from "react";
import { LuThumbsDown, LuThumbsUp } from "react-icons/lu";
import type {
  SentenceVoteChoice,
  SentenceVoteDirection,
  SentenceVoteState,
} from "@/lib/cases/types";

const OPTIONS = [
  {
    choice: "AGREE",
    label: "괜찮다",
    Icon: LuThumbsUp,
    selected: "border-[#3f8f84] bg-[#3f8f84] text-white",
    idle: "hover:border-[#3f8f84]/60 hover:text-[#3f8f84]",
  },
  {
    choice: "DISAGREE",
    label: "아니다",
    Icon: LuThumbsDown,
    selected: "border-[#c46a4b] bg-[#c46a4b] text-white",
    idle: "hover:border-[#c46a4b]/60 hover:text-[#c46a4b]",
  },
] as const;

const DIRECTIONS = [
  { direction: "TOO_LENIENT", label: "너무 가볍습니다" },
  { direction: "TOO_HARSH", label: "너무 무겁습니다" },
] as const;

/** 형량 찬반 투표. 쿠키에 묶인 내 투표와 집계는 요청 시점 데이터라 브라우저에서 불러옴 */
export function SentenceVote({ sentenceId }: { sentenceId: string }) {
  const [vote, setVote] = useState<SentenceVoteState | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const endpoint = `/api/sentences/${encodeURIComponent(sentenceId)}/vote`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { signal: controller.signal, cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`투표 조회 실패 ${res.status}`);
        return res.json() as Promise<SentenceVoteState>;
      })
      .then((state) => {
        setVote(state);
        setFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [endpoint]);

  const cast = async (choice: SentenceVoteChoice, direction?: SentenceVoteDirection) => {
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ choice, direction }),
      });
      if (!res.ok) throw new Error(`투표 실패 ${res.status}`);
      setVote((await res.json()) as SentenceVoteState);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  const results = vote?.results;
  const agreePercent = results?.total
    ? Math.round((results.agree / results.total) * 100)
    : 0;
  const directionTotal = results ? results.tooLenient + results.tooHarsh : 0;
  const lenientPercent = directionTotal
    ? Math.round((results!.tooLenient / directionTotal) * 100)
    : 0;

  return (
    <div className="mt-6 border-t border-line pt-5">
      <p className="text-center font-semibold">이 형량이 괜찮다고 생각하십니까?</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {OPTIONS.map(({ choice, label, Icon, selected, idle }) => {
          const isMine = vote?.choice === choice;
          return (
            <button
              key={choice}
              type="button"
              aria-pressed={isMine}
              disabled={pending || !vote}
              onClick={() => cast(choice)}
              className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#c46a4b]/25 disabled:cursor-wait ${
                isMine ? selected : `border-line bg-background text-muted ${idle}`
              }`}
            >
              <Icon aria-hidden className="size-7" />
              {label}
            </button>
          );
        })}
      </div>

      {vote?.choice === "DISAGREE" && (
        <div className="mt-4 rounded-xl bg-[#c46a4b]/8 p-4">
          <p className="text-center text-sm font-semibold">어느 쪽이라고 생각하십니까?</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DIRECTIONS.map(({ direction, label }) => {
              const isMine = vote.direction === direction;
              return (
                <button
                  key={direction}
                  type="button"
                  aria-pressed={isMine}
                  disabled={pending}
                  onClick={() => cast("DISAGREE", direction)}
                  className={`min-h-11 rounded-lg border px-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#c46a4b]/25 disabled:cursor-wait ${
                    isMine
                      ? "border-[#c46a4b] bg-[#c46a4b] text-white"
                      : "border-line bg-background text-muted hover:border-[#c46a4b]/60 hover:text-[#c46a4b]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div aria-live="polite" className="mt-4 text-sm">
        {failed && (
          <p role="alert" className="text-center text-[#c46a4b]">
            투표를 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.
          </p>
        )}
        {results && !failed && (
          <div>
            <div className="flex justify-between font-semibold">
              <span className="text-[#3f8f84]">괜찮다 {agreePercent}%</span>
              <span className="text-[#c46a4b]">아니다 {100 - agreePercent}%</span>
            </div>
            <div aria-hidden className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#c46a4b]">
              <div
                className="h-full bg-[#3f8f84] transition-[width] duration-300"
                style={{ width: `${agreePercent}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-subtle">
              {results.total.toLocaleString("ko-KR")}명 참여 · 다른 쪽을 누르면 의견을 바꿀 수 있습니다
            </p>
            {directionTotal > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <div className="flex justify-between text-xs font-semibold text-muted">
                  <span>너무 가볍습니다 {lenientPercent}%</span>
                  <span>너무 무겁습니다 {100 - lenientPercent}%</span>
                </div>
                <div aria-hidden className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#c46a4b]/30">
                  <div
                    className="h-full bg-[#c46a4b] transition-[width] duration-300"
                    style={{ width: `${lenientPercent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-center text-xs text-subtle">
                  아니다 {results.disagree.toLocaleString("ko-KR")}명 중{" "}
                  {directionTotal.toLocaleString("ko-KR")}명이 고른 결과입니다
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
