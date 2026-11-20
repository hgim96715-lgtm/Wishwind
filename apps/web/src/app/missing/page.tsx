import type { Metadata } from "next";
import { HomeLogo } from "@/components/common/HomeLogo";
import { Suspense } from "react";
import { HelpLink } from "@/components/help/HelpBar";
import { MissingExperience } from "@/components/missing/MissingExperience";
import { ApiUnavailableError } from "@/lib/cases/api";
import { getAllMissing } from "@/lib/missing/api";
import { groupByRegion } from "@/lib/missing/regions";

export const metadata: Metadata = {
  alternates: { canonical: "/missing" },
  title: "실종방",
  description: "실종된 사람들이 무사히 집으로 돌아올 수 있도록, 바람개비 정원에서 함께 바람을 모읍니다.",
};

export default function MissingPage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#f4e6d4]">
      <header className="pointer-events-none absolute top-0 left-0 z-20 p-5">
        <HomeLogo onSky />
        {/* 하늘 색이 시간대마다 바뀌므로(밤엔 어두움) 글자 뒤에 반투명 바탕을 둠 */}
        <div className="mt-3 rounded-2xl bg-white/70 px-3 py-2 backdrop-blur">
          <h1 className="text-xl font-semibold text-[#5b4d3c]">실종방</h1>
          <p className="hidden text-sm text-[#7a6650] sm:block">무사히 집으로 돌아오길 바라며, 함께 바람개비를 꽂습니다.</p>
          <p className="mt-1 text-xs text-[#7a6650]">
            실종 신고{" "}
            <a href="tel:182" className="pointer-events-auto font-semibold text-[#2f7469] underline-offset-2 hover:underline">
              182
            </a>{" "}
            · 긴급{" "}
            <a href="tel:112" className="pointer-events-auto font-semibold text-[#2f7469] underline-offset-2 hover:underline">
              112
            </a>
          </p>
        </div>
        <HelpLink className="pointer-events-auto mt-2" />
      </header>
      <Suspense fallback={<div className="flex h-full items-center justify-center text-[#7a6650]">바닷가 언덕으로 가고 있습니다…</div>}>
        <MissingPath />
      </Suspense>
    </main>
  );
}

async function MissingPath() {
  let people: Awaited<ReturnType<typeof getAllMissing>>;
  try {
    people = await getAllMissing();
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return (
        <div className="flex h-full items-center justify-center px-6 text-center text-[#7a6650]">
          {process.env.NODE_ENV === "development"
            ? "API 서버가 꺼져 있는 것 같습니다. pnpm dev:api로 서버를 켠 뒤 새로고침해 주세요."
            : "실종자 정보를 잠시 불러오지 못했습니다. 잠시 후 다시 새로고침해 주세요."}
        </div>
      );
    }
    throw error;
  }
  return <MissingExperience groups={groupByRegion(people)} />;
}
