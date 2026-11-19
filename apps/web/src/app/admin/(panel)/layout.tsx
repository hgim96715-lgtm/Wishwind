import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: { default: "관리실", template: "%s | 관리실" },
  robots: { index: false, follow: false },
};

// 로그인 확인은 각 페이지의 Suspense 안에서 함 (쿠키 읽기는 요청 시점 데이터라 정적 셸 밖에서만 가능)
export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminNav />
      <main className="min-w-0 flex-1 px-4 py-8 md:px-10">{children}</main>
    </div>
  );
}
