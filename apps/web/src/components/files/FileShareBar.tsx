"use client";

import { useEffect, useState } from "react";
import { LuDownload, LuEye, LuShare2 } from "react-icons/lu";
import { fetchFileStats, fileUrl, recordFileEvent, type FileStats, type FileType, type ShareChannel } from "@/lib/files/client";

const fmt = (n: number) => n.toLocaleString("ko-KR");

/**
 * 사건 파일·실종자 카드 공통: "N명이 이 파일을 열었습니다" + 링크 공유 + 스토리용 전단지 저장.
 * 연 사람은 파일을 열 때 한 번 기록하고(같은 사람은 하루 1번), 숫자는 1분마다 갱신된 값을 보여 줌
 */
export function FileShareBar({
  type,
  fileKey,
  title,
  flyer = true,
  tone = "case",
}: {
  type: FileType;
  fileKey: string;
  title: string;
  /** 전단지 저장 버튼을 보일지 (국내 실종자 자료는 이용 조건 확인 전까지 숨김) */
  flyer?: boolean;
  tone?: "case" | "missing";
}) {
  const [stats, setStats] = useState<FileStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      await recordFileEvent(type, fileKey, "VIEW");
      const next = await fetchFileStats(type, fileKey, ac.signal).catch(() => null);
      if (next) setStats(next);
    })();
    return () => ac.abort();
  }, [type, fileKey]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const shared = (channel: ShareChannel) => {
    void recordFileEvent(type, fileKey, "SHARE", channel);
    setStats((s) => (s ? { ...s, shares: s.shares + 1 } : s));
  };

  const shareLink = async () => {
    const url = fileUrl(type, fileKey);
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        shared("native");
      } catch {
        // 공유 창을 닫은 경우
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("링크를 복사했습니다. 원하는 곳에 붙여 넣어 주세요.");
      shared("link");
    } catch {
      setToast("링크를 복사하지 못했습니다.");
    }
  };

  const saveFlyer = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/flyer/${type}/${encodeURIComponent(fileKey)}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const file = new File([blob], `${title.slice(0, 40)}.png`, { type: "image/png" });
      // 휴대폰: 공유 창에서 바로 인스타그램 스토리 등으로 보냄. 컴퓨터: 이미지 파일로 저장
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title });
          shared("flyer");
        } catch {
          // 공유 창을 닫은 경우
        }
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        setToast("전단지 이미지를 저장했습니다. 스토리에 올려 함께 알려 주세요.");
        shared("flyer");
      }
    } catch {
      setToast("전단지를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const accent = tone === "missing" ? "bg-[#e9a94f] hover:bg-[#d9963b]" : "bg-[#c46a4b] hover:bg-[#b05a3d]";
  return (
    <div className="mt-4">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle" aria-live="polite">
        <LuEye aria-hidden className="size-3.5" />
        {stats ? (
          <>
            <span>
              지금까지 <strong className="font-semibold text-foreground">{fmt(stats.views)}명</strong>이 이 파일을 열었습니다
            </span>
            <span>· 오늘 {fmt(stats.today)}명</span>
            <span>· {fmt(stats.shares)}명이 공유했습니다</span>
          </>
        ) : (
          <span>함께 보는 사람을 세고 있습니다…</span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={shareLink}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm transition-colors hover:bg-[#f3e6d2]"
        >
          <LuShare2 aria-hidden className="size-4" />
          링크 공유
        </button>
        {flyer && (
          <button
            type="button"
            onClick={saveFlyer}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-60 ${accent}`}
          >
            <LuDownload aria-hidden className="size-4" />
            {busy ? "전단지를 만드는 중…" : "스토리용 전단지 저장"}
          </button>
        )}
      </div>
      {toast && <p className="mt-2 text-xs text-[#6b5a46]">{toast}</p>}
    </div>
  );
}
