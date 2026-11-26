import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LuMegaphone, LuSend } from "react-icons/lu";
import { BriefingAutoRefresh } from "@/components/briefing/BriefingAutoRefresh";
import { BriefingFeed, BriefingSkeleton } from "@/components/briefing/BriefingFeed";
import { RoomHeader } from "@/components/room/RoomHeader";

export const metadata: Metadata = {
  alternates: { canonical: "/briefing" },
  title: "브리핑룸",
  description: "새 소식, 사건 변경, 사람들의 생각, 공지사항을 한곳에서 봅니다.",
};

export default function BriefingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <RoomHeader slug="briefing" />
      <BriefingAutoRefresh />
      <Suspense fallback={<BriefingSkeleton />}>
        <BriefingFeed />
      </Suspense>
      <section className="mt-14 flex flex-col items-start gap-3 rounded-xl border border-dashed border-line bg-surface/70 p-6 sm:flex-row sm:items-center">
        <LuMegaphone aria-hidden className="size-6 shrink-0 text-steel-ink" />
        <div className="flex-1">
          <p className="font-medium">잘못된 내용을 찾았거나, 바라는 점이 있나요?</p>
          <p className="text-sm text-muted">정정 요청, 문의, 의견을 남겨 주시면 확인하고 답변드립니다.</p>
        </div>
        <Link
          href="/contact"
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-surface"
        >
          <LuSend aria-hidden className="size-4" />
          문의·의견 보내기
        </Link>
      </section>
    </main>
  );
}
