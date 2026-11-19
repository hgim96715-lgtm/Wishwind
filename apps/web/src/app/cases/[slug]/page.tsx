import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LuArrowLeft } from "react-icons/lu";
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
        className="mb-10 inline-flex items-center gap-1.5 text-sm text-subtle transition-colors hover:text-foreground"
      >
        <LuArrowLeft aria-hidden className="size-4" />
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
