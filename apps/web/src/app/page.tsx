import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountLink } from "@/components/home/AccountLink";
import { DidYouKnow } from "@/components/home/DidYouKnow";
import { ReelCases } from "@/components/home/ReelCases";
import { AccountLinkSkeleton, DidYouKnowSkeleton, ReelCasesSkeleton } from "@/components/home/HomeSkeletons";
import { HomeContent } from "@/components/home/HomeContent";

// 대표 주소를 홈에만 지정함 (다른 페이지가 홈을 대표 주소로 물려받지 않게 레이아웃에서는 뺌)
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <HomeContent
      accountLink={
        <Suspense fallback={<AccountLinkSkeleton />}>
          <AccountLink />
        </Suspense>
      }
    >
      {/* 릴스를 보고 온 사람이 방금 본 사건을 바로 찾는 곳 */}
      <Suspense fallback={<ReelCasesSkeleton />}>
        <ReelCases />
      </Suspense>

      {/* 오늘의 기념일 or 대표 사건 카드 */}
      <Suspense fallback={<DidYouKnowSkeleton />}>
        <DidYouKnow />
      </Suspense>
    </HomeContent>
  );
}
