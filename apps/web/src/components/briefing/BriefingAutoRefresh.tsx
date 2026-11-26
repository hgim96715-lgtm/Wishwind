"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 150_000;

async function fetchIds(): Promise<string[] | null> {
  try {
    const res = await fetch("/api/briefing/ids", { cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { ids: string[] }).ids;
  } catch {
    return null;
  }
}

/**
 * 브리핑룸을 열어 둔 채로 있어도 새 소식이 온 것을 알려 줌.
 * 화면이 보일 때만 2~3분마다 새 소식·브리핑 id를 확인하고, 처음 본 목록에 없던 것이 생기면
 * 화면을 갑자기 바꾸지 않고 "새 소식 N건 보기" 버튼만 띄움 (눌렀을 때만 router.refresh).
 * 다른 탭에 있다가 돌아오면 마지막 확인 뒤 1분이 지났을 때 바로 한 번 확인함
 */
export function BriefingAutoRefresh() {
  const router = useRouter();
  const known = useRef<Set<string> | null>(null);
  const last = useRef(0);
  const [fresh, setFresh] = useState(0);

  const check = useCallback(async () => {
    last.current = Date.now();
    const ids = await fetchIds();
    if (!ids) return;
    if (!known.current) {
      known.current = new Set(ids);
      return;
    }
    const added = ids.filter((id) => !known.current!.has(id)).length;
    setFresh(added);
  }, []);

  useEffect(() => {
    void check();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last.current > 60_000) void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  if (fresh === 0) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        router.refresh();
        known.current = null;
        setFresh(0);
        await check();
      }}
      className="fixed top-20 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#2f7469] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
    >
      새 소식 {fresh}건 보기
    </button>
  );
}
