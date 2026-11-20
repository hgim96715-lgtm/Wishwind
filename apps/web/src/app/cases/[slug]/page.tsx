import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  CaseDetailSkeleton,
  CaseDetailView,
} from "@/components/cases/CaseDetailView";

export const metadata: Metadata = {
  title: "사건 파일",
};

// generateStaticParams 없이 쓰므로 params는 요청 시점 데이터임 → Suspense 안에서만 꺼냄
export default function CasePage({ params }: PageProps<"/cases/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 md:px-10">
      <Link
        href="/cases"
        className="mb-10 inline-flex items-center rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-muted shadow-sm transition-colors hover:bg-white hover:text-foreground"
      >
        사건방으로
      </Link>
      <Suspense fallback={<CaseDetailSkeleton />}>
        {params.then(({ slug }) => (
          <CaseDetailView slug={slug} />
        ))}
      </Suspense>
    </main>
  );
}
