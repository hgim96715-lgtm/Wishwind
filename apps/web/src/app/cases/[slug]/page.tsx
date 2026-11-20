import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { getCase } from "@/lib/cases/api";
import {
  CaseDetailSkeleton,
  CaseDetailView,
} from "@/components/cases/CaseDetailView";

/** 사건마다 제목·요약을 검색 결과와 공유 미리보기에 씀 */
export async function generateMetadata({ params }: PageProps<"/cases/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await caseForMeta(slug);
  if (!data) return { title: "사건 파일" };
  const description = data.summary.length > 155 ? `${data.summary.slice(0, 154)}…` : data.summary;
  const path = `/cases/${encodeURIComponent(slug)}`;
  return {
    title: data.title,
    description,
    alternates: { canonical: path },
    // openGraph·twitter는 통째로 덮어써지므로 공유 이미지도 다시 넣음
    openGraph: {
      type: "article",
      title: data.title,
      description,
      url: path,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: data.title }],
    },
    twitter: { card: "summary_large_image", title: data.title, description, images: ["/og-image.png"] },
  };
}

async function caseForMeta(slug: string) {
  "use cache";
  cacheLife("minutes");
  try {
    return await getCase(slug);
  } catch {
    return null;
  }
}

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
