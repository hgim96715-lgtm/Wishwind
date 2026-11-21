import type { Metadata } from "next";
import { HomeLogo } from "@/components/common/HomeLogo";
import { Suspense } from "react";
import { HelpLink } from "@/components/help/HelpBar";
import { MissingExperience } from "@/components/missing/MissingExperience";
import { ApiUnavailableError } from "@/lib/cases/api";
import { getAllMissing, getMissing } from "@/lib/missing/api";
import { formatMissingDate, groupByRegion } from "@/lib/missing/regions";
import { displayName } from "@/lib/og/helpers";

const ROOM_DESCRIPTION = "지금도 집으로 돌아오지 못한 분들을 기억하고, 무사 귀가를 바라는 바람개비를 꽂습니다.";

/**
 * 공유 미리보기: 실종방 링크는 찾고 있는 분들의 사진·인원 수·QR이 담긴 이미지로,
 * 특정 분의 링크(?person=id, FBI 공개 자료)는 그 분의 사진·이름·제보처가 담긴 이미지로 보임
 */
export async function generateMetadata({ searchParams }: PageProps<"/missing">): Promise<Metadata> {
  const raw = (await searchParams).person;
  const person = typeof raw === "string" ? raw : null;
  let title = "실종방";
  let description = ROOM_DESCRIPTION;
  if (person) {
    const data = await getMissing(person).catch(() => null);
    if (data) {
      const place = data.lastSeenPlace ?? data.region;
      const when = data.missingDate ? `${formatMissingDate(data.missingDate)} ` : "";
      title = `${displayName(data.name)} 님을 찾습니다`;
      description =
        data.source === "SAFE182"
          ? `${when}${place}에서 실종되었습니다. 보셨다면 실종 신고 182(긴급할 때는 112)로 알려 주세요.`
          : `${when}${place}에서 실종되었습니다. 보셨다면 공식 제보 창구(${data.tip.label})에 알려 주세요.`;
    }
  }
  const image = { url: person ? `/api/og/missing?person=${encodeURIComponent(person)}` : "/api/og/missing", width: 1200, height: 630, alt: title };
  return {
    alternates: { canonical: "/missing" },
    title,
    description,
    openGraph: { type: "website", title: `${title} | Wishwind`, description, url: person ? `/missing?person=${encodeURIComponent(person)}` : "/missing", images: [image] },
    twitter: { card: "summary_large_image", title: `${title} | Wishwind`, description, images: [image.url] },
  };
}

export default function MissingPage() {
  return (
    <main className="garden-page relative h-dvh w-full overflow-hidden bg-[#f4e6d4]">
      <header className="pointer-events-none absolute top-0 left-0 z-20 p-5">
        <HomeLogo onSky />
        {/* 하늘 색이 시간대마다 바뀌므로(밤엔 어두움) 글자 뒤에 반투명 바탕을 둠 */}
        <div className="mt-3 rounded-2xl bg-white/70 px-3 py-2 backdrop-blur">
          <h1 className="text-xl font-semibold text-[#5b4d3c]">실종방</h1>
          <p className="hidden text-sm text-[#7a6650] sm:block">무사히 집으로 돌아오길 바라며, 함께 바람개비를 꽂습니다.</p>
          <p className="mt-1 text-xs text-[#7a6650]">
            실종 신고{" "}
            <a href="tel:182" className="pointer-events-auto font-semibold text-[#2f7469] transition-opacity hover:opacity-70">
              182
            </a>{" "}
            · 긴급{" "}
            <a href="tel:112" className="pointer-events-auto font-semibold text-[#2f7469] transition-opacity hover:opacity-70">
              112
            </a>
          </p>
        </div>
        <HelpLink className="pointer-events-auto mt-2" />
      </header>
      <Suspense fallback={<div className="garden-veil flex h-full items-center justify-center text-[#7a6650]">바닷가 언덕으로 가고 있습니다…</div>}>
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
