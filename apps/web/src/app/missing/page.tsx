import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { HomeLogo } from "@/components/common/HomeLogo";
import { GardenExpo } from "@/components/missing/GardenExpo";
import { getMissing } from "@/lib/missing/api";
import { formatMissingDate } from "@/lib/missing/regions";
import { displayName } from "@/lib/og/helpers";

const ROOM_DESCRIPTION = "사정에 따라 이어진 정원별 길을 걸으며, 지금도 집으로 돌아오지 못한 분들을 기억하고 바람개비에 응원의 바람을 보냅니다.";

/**
 * 공유 미리보기: 실종자들의 정원 링크는 찾고 있는 분들의 사진·인원 수·QR이 담긴 이미지로,
 * 특정 분의 링크(?person=id, FBI 공개 자료)는 그 분의 사진·이름·제보처가 담긴 이미지로 보임
 */
export async function generateMetadata({ searchParams }: PageProps<"/missing">): Promise<Metadata> {
  const raw = (await searchParams).person;
  const person = typeof raw === "string" ? raw : null;
  let title = "실종자들의 정원";
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
    <main className="garden-theme-scope relative bg-[#dce7df] text-[#34483e]">
      <header className="expo-header pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-3 py-3 sm:px-5 sm:py-5 [&_a]:pointer-events-auto">
        <HomeLogo onSky />
        <span className="hidden sm:block rounded-full border border-white/70 bg-[#fbfaf1]/90 px-4 py-2 text-xs">함께 기다리는 바람개비 정원</span>
      </header>
      <GardenExpo />
      <Suspense fallback={null}><RequestMetadata /></Suspense>
    </main>
  );
}

// Person-specific sharing metadata depends on the incoming search parameters.
async function RequestMetadata() {
  await connection();
  return null;
}
