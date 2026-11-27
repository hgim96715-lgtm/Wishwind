import type { Metadata, Viewport } from "next";
import { HomeLogo } from "@/components/common/HomeLogo";
import { ExhibitionView } from "@/components/missing/ExhibitionView";

// 미리보기 전용: 검색에 나오지 않게 함. 마음에 들면 /missing으로 옮길 것
export const metadata: Metadata = { title: "정원 전시 미리보기", robots: { index: false, follow: false } };
export const viewport: Viewport = { colorScheme: "only light", themeColor: "#efe9df" };

export default function ExhibitPreviewPage() {
  return (
    <main className="garden-theme-scope relative bg-[#dce7df] text-[#34483e]">
      <header className="expo-header pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-3 py-3 sm:px-5 sm:py-5 [&_a]:pointer-events-auto">
        <HomeLogo onSky />
      </header>
      <ExhibitionView />
    </main>
  );
}
