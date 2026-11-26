"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * 페이지를 옮길 때마다 조회 1건을 보냄. 쿠키를 쓰지 않고, 관리실(/admin)은 세지 않음.
 * sendBeacon은 페이지를 떠나는 중에도 전송이 보장되고 화면 렌더링을 막지 않음
 */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const source = new URLSearchParams(window.location.search).get("utm_source") ?? undefined;
    const body = JSON.stringify({ path: pathname, referrer: document.referrer || undefined, source });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/pageview", blob)) {
      void fetch("/api/pageview", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  }, [pathname]);
  return null;
}
