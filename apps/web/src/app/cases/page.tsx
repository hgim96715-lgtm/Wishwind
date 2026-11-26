import type { Metadata } from "next";
import { Suspense } from "react";
import { BottomSheet } from "@/components/cases/BottomSheet";
import { CaseDetailView, CaseDetailSkeleton } from "@/components/cases/CaseDetailView";
import { CaseSolvingTech } from "@/components/briefing/CaseSolvingTech";
import { CaseFiltersForm } from "@/components/cases/CaseFilters";
import { CaseList, CaseListSkeleton } from "@/components/cases/CaseList";
import { RoomHeader } from "@/components/room/RoomHeader";
import { parseCaseFilters } from "@/lib/cases/filters";

export const metadata: Metadata = {
  title: "사건방",
  description: "국내외 미제·주요 사건을 나라와 유형별 책장으로 정리했습니다. 사건 개요, 타임라인, 판결, 생각해볼 점을 볼 수 있습니다.",
  alternates: { canonical: "/cases" },
};

// 헤더는 정적 셸로 미리 렌더링됨.
// searchParams는 요청 시점 데이터라 Suspense 안에서만 꺼냄 (Cache Components 규칙)
export default function CasesPage({ searchParams }: PageProps<"/cases">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <RoomHeader slug="cases" />
      <Suspense fallback={<CaseListSkeleton />}>
        {searchParams.then((sp) => {
          const filters = parseCaseFilters(sp);
          const file = Array.isArray(sp.file) ? sp.file[0] : sp.file;
          const closeParams = new URLSearchParams();
          for (const [key, value] of Object.entries(sp)) {
            if (key === "file" || value === undefined) continue;
            for (const item of Array.isArray(value) ? value : [value]) closeParams.append(key, item);
          }
          const closeHref = `/cases${closeParams.size ? `?${closeParams}` : ""}`;
          return (
            <>
              {file && <BottomSheet key={file} label="사건 파일" closeHref={closeHref}>
                <Suspense fallback={<CaseDetailSkeleton />}><CaseDetailView slug={file} /></Suspense>
              </BottomSheet>}
              <section className="mt-8">
                <CaseFiltersForm filters={filters} />
              </section>
              <section className="mt-10">
                <Suspense key={JSON.stringify(filters)} fallback={<CaseListSkeleton />}>
                  <CaseList filters={filters} />
                </Suspense>
              </section>
              <section className="mt-12">
                <Suspense fallback={null}>
                  <CaseSolvingTech />
                </Suspense>
              </section>
            </>
          );
        })}
      </Suspense>
    </main>
  );
}
