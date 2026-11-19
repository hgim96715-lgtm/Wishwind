import type { Metadata } from "next";
import { Suspense } from "react";
import { CaseFiltersForm } from "@/components/cases/CaseFilters";
import { CaseList, CaseListSkeleton } from "@/components/cases/CaseList";
import { RoomHeader } from "@/components/room/RoomHeader";
import { parseCaseFilters } from "@/lib/cases/filters";

export const metadata: Metadata = {
  title: "사건방",
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
          return (
            <>
              <section className="mt-8">
                <CaseFiltersForm filters={filters} />
              </section>
              <section className="mt-10">
                <Suspense key={JSON.stringify(filters)} fallback={<CaseListSkeleton />}>
                  <CaseList filters={filters} />
                </Suspense>
              </section>
            </>
          );
        })}
      </Suspense>
    </main>
  );
}
