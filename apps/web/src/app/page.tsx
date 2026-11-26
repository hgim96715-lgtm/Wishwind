import Image from "next/image";
import { Suspense } from "react";
import Link from "next/link";
import { LuHeartHandshake } from "react-icons/lu";
import { AccountLink } from "@/components/home/AccountLink";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { DidYouKnow } from "@/components/home/DidYouKnow";
import { RoomGrid } from "@/components/home/RoomGrid";
import { FeaturedCases } from "@/components/home/FeaturedCases";
import { TodayTechCard } from "@/components/home/TodayTechCard";
import { getCases } from "@/lib/cases/api";
import { INSTAGRAM_URL } from "@/lib/site";

/** 사건 수는 요청 때 가져오므로 Suspense 안에서만 읽음 (첫 화면 prerender를 막지 않게). 불러오는 동안·실패 시에는 숫자 없는 카드를 보여 줌 */
async function RoomGridWithCount() {
  let caseCount: number | undefined;
  try {
    caseCount = (await getCases()).items.length;
  } catch {
    caseCount = undefined;
  }
  return <RoomGrid caseCount={caseCount} />;
}

export default function Home() {
  return (
    <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <ThemeToggle />
        <Suspense fallback={null}>
          <AccountLink />
        </Suspense>
      </div>

      {/* 히어로: 모바일 첫 화면에서 대표 사건 카드가 바로 보이도록 여백 컴팩트 */}
      <section className="mb-10">
        <Image src="/wishwind-logo.png" alt="Wishwind" width={720} height={240} priority className="brand-logo h-12 w-auto md:h-14" />
        <h1 className="mt-4 text-4xl font-bold leading-snug tracking-tight md:text-5xl md:leading-tight">
          작은 바람이 모이면,
          <br />
          바람개비가 돕니다.
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-muted">
          지난 사건을 함께 기억하고, 실종된 사람이 돌아오기를, 같은 일이 다시
          없기를 바랍니다.
        </p>
        <p className="mt-2 text-xs text-subtle">
          Wishwind는 바람(wind)과 바람(wish)을 함께 담은 이름입니다.
        </p>
      </section>

      {/* 오늘의 기념일 or 대표 사건 카드 */}
      <Suspense fallback={null}>
        <DidYouKnow />
      </Suspense>

      {/* 3개 방 카드 */}
      <Suspense fallback={<RoomGrid />}>
        <RoomGridWithCount />
      </Suspense>

      {/* 지금 살펴볼 사건 3개 */}
      <Suspense fallback={null}>
        <FeaturedCases />
      </Suspense>

      {/* 오늘의 추적 지식 미니 카드 */}
      <TodayTechCard />

      {/* 도움이 필요할 때: 하단으로 이동 */}
      <div className="mt-10 flex flex-col gap-3 rounded-xl border border-[#d9cdb8] bg-[#fbf6ea] px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
        <Link href="/help" className="group flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#3f8f84]/15 text-[#2f7469]">
            <LuHeartHandshake aria-hidden className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold transition-colors group-hover:text-[#2f7469]">도움이 필요할 때</span>
            <span className="block text-xs text-muted">신고·상담 번호를 상황별로 모았습니다</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { label: "긴급", n: "112" },
            { label: "실종", n: "182" },
            { label: "마음", n: "109" },
          ].map((c) => (
            <a
              key={c.n}
              href={`tel:${c.n}`}
              aria-label={`${c.label} ${c.n}로 전화 걸기`}
              className="rounded-full border border-[#3f8f84]/30 bg-white/70 px-2.5 py-1 text-[#2f7469] hover:bg-white"
            >
              {c.label} <span className="font-semibold tabular-nums">{c.n}</span>
            </a>
          ))}
          <Link
            href="/help"
            className="ml-auto inline-flex items-center gap-1 pl-1 font-medium text-[#2f7469] transition-opacity hover:opacity-70 sm:ml-2"
          >
            도움받는 곳
          </Link>
        </div>
      </div>

      {/* 공식 SNS */}
      <footer className="mt-10 flex justify-center border-t border-line pt-5 text-sm text-muted">
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" className="transition-colors hover:text-foreground">
          인스타그램 @wishwind.official
        </a>
      </footer>
    </main>
  );
}
