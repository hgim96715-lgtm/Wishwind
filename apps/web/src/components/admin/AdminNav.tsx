import Link from "next/link";
import {
  LuChartColumn,
  LuClipboardList,
  LuFolderSearch,
  LuInbox,
  LuInstagram,
  LuLayoutDashboard,
  LuLogOut,
  LuMessageSquareHeart,
  LuNewspaper,
  LuShieldAlert,
} from "react-icons/lu";
import { logout } from "@/app/admin/actions";

const LINKS = [
  { href: "/admin", label: "한눈에 보기", icon: LuLayoutDashboard },
  { href: "/admin/cases", label: "사건 검토·수정", icon: LuFolderSearch },
  { href: "/admin/news", label: "새 뉴스 확인", icon: LuNewspaper },
  { href: "/admin/briefing", label: "브리핑 글·공지", icon: LuClipboardList },
  { href: "/admin/moderation", label: "부적절한 글", icon: LuShieldAlert },
  { href: "/admin/inquiries", label: "문의", icon: LuInbox },
  { href: "/admin/feedback", label: "의견", icon: LuMessageSquareHeart },
  { href: "/admin/analytics", label: "방문자 분석", icon: LuChartColumn },
  { href: "/admin/instagram", label: "인스타 준비", icon: LuInstagram },
] as const;

export function AdminNav() {
  return (
    <aside className="border-b border-line bg-surface/70 md:min-h-screen md:w-56 md:shrink-0 md:border-r md:border-b-0">
      <div className="flex items-center justify-between px-5 py-4 md:block">
        <Link href="/admin" className="block">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">Case Office</p>
          <p className="text-lg font-semibold">관리실</p>
        </Link>
        <Link href="/" className="text-xs text-subtle hover:text-foreground md:mt-1 md:inline-block">
          사이트 보기 ↗
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-line/50 hover:text-foreground"
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </Link>
        ))}
        <form action={logout} className="md:mt-4">
          <button
            type="submit"
            className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-subtle hover:text-foreground"
          >
            <LuLogOut aria-hidden className="size-4" />
            로그아웃
          </button>
        </form>
      </nav>
    </aside>
  );
}
