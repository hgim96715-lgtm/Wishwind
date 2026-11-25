"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_MS = 60_000;

/**
 * 브리핑룸을 열어 둔 채로 있어도 새 소식이 들어오게 함.
 * 화면이 보일 때만 1분마다 서버 데이터를 다시 받고(router.refresh: 스크롤·재생 상태는 그대로),
 * 다른 탭에 있다가 돌아오면 바로 한 번 받음.
 */
export function BriefingAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      last = Date.now();
      router.refresh();
    };
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > REFRESH_MS / 2) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
