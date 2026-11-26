"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuHeartHandshake } from "react-icons/lu";
import { ThemeToggle } from "@/components/common/ThemeToggle";

/** 모든 페이지 위쪽에 늘 보이는 '도움이 필요할 때' 링크 */
export function HelpLink({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/help"
      className={`inline-flex items-center gap-1.5 rounded-full border border-jade/30 bg-[#fffdf8]/90 px-3 py-1 text-xs font-medium text-jade-ink hover:bg-white ${className}`}
    >
      <LuHeartHandshake aria-hidden className="size-3.5" />
      도움이 필요할 때
    </Link>
  );
}

/**
 * 페이지 위 얇은 띠: 화면 밝기 전환 + 도움 링크. 실종자들의 정원은 화면 전체를 쓰는 정원이라 띠 대신 자체 머리말에 링크를 둠.
 * 도움받는 곳 페이지와 관리실, 그리고 방 카드 위에 큰 안내 띠가 있는 홈에서는 숨김
 */
export function HelpBar() {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/missing") || pathname.startsWith("/admin")) return null;
  return (
    <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-2 px-6 pt-3">
      <ThemeToggle />
      {/* 도움받는 곳 페이지에서는 자기 자신을 가리키는 링크라 뺌 */}
      {!pathname.startsWith("/help") && <HelpLink />}
    </div>
  );
}
