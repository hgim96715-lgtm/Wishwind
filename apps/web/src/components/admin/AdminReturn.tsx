"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** 관리자로 로그인한 채 사이트를 둘러볼 때만, 관리실 밖 페이지 왼쪽 아래에 '관리실로 돌아가기'를 띄움 */
export function AdminReturn() {
  const pathname = usePathname();
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    // 쿠키는 마운트 후에만 읽을 수 있음
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdmin(document.cookie.split("; ").some((c) => c === "cold_cases_admin_hint=1"));
  }, [pathname]);

  if (!admin || pathname.startsWith("/admin")) return null;
  return (
    <Link
      href="/admin"
      className="fixed bottom-4 left-4 z-[60] rounded-full bg-foreground px-4 py-2 text-sm font-medium text-surface shadow-lg transition-opacity hover:opacity-85"
    >
      관리실로 돌아가기
    </Link>
  );
}
