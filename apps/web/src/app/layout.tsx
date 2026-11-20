import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { PageViewTracker } from "@/components/PageViewTracker";
import "./globals.css";
import { HelpBar } from "@/components/help/HelpBar";
import { DevViewerSwitch } from "@/components/dev/DevViewerSwitch";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Wishwind",
    template: "%s | Wishwind",
  },
  description: "지난 사건을 함께 기억하고, 실종된 사람이 돌아오기를 바라는 곳",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* 주소를 읽는 클라이언트 컴포넌트라 Suspense로 감싸 나머지는 정적으로 렌더링 */}
        <Suspense fallback={null}>
          <HelpBar />
        </Suspense>
        {children}
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        {/* 개발 모드에서만: 다른 사람 눈에 보이는 화면 확인 */}
        <DevViewerSwitch />
      </body>
    </html>
  );
}
