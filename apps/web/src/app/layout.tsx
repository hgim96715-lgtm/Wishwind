import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { PageViewTracker } from "@/components/PageViewTracker";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/site";
import { HelpBar } from "@/components/help/HelpBar";
import { DevViewerSwitch } from "@/components/dev/DevViewerSwitch";
import { AdminReturn } from "@/components/admin/AdminReturn";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** 밝은 화면 하나로 디자인했으므로 폰이 다크 모드여도 그대로 보이게 함 (주소창 색도 배경색과 맞춤) */
export const viewport: Viewport = {
  colorScheme: "only light",
  themeColor: "#efe9df",
};

/** 검색엔진·공유 미리보기 기본값. 각 페이지의 title·description이 이 위에 덮어씀 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - 사건을 기억하고 실종자가 돌아오길 바라는 곳`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  // 구글 서치 콘솔·네이버 서치어드바이저 소유 확인 값 (배포 환경 변수로 넣음)
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.NAVER_SITE_VERIFICATION ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION } : undefined,
  },
  formatDetection: { telephone: false },
};

/** 검색엔진이 사이트 이름·로고를 알아보게 하는 구조화 데이터 */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: "위시윈드",
      description: SITE_DESCRIPTION,
      inLanguage: "ko-KR",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
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
        {/* 관리자로 로그인한 채 둘러볼 때 관리실로 돌아가는 버튼 */}
        <Suspense fallback={null}>
          <AdminReturn />
        </Suspense>
      </body>
    </html>
  );
}
