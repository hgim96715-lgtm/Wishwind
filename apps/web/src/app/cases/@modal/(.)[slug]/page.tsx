import { Suspense } from "react";
import { BottomSheet } from "@/components/cases/BottomSheet";
import {
  CaseDetailSkeleton,
  CaseDetailView,
} from "@/components/cases/CaseDetailView";

/**
 * Next 16.4.6 개발 서버에서 가로채기 경로의 params에 "(.)" 표시가 붙어 오는 문제가 있음
 * (예: "(.)(.)seohyeon-station-attack") → API가 404를 돌려 기본 404 화면이 뜸.
 * slug는 영문 소문자·숫자·하이픈만 쓰므로 앞에 붙은 표시만 걷어 냄
 */
function stripInterceptionMarker(slug: string) {
  let value = slug;
  try {
    value = decodeURIComponent(slug);
  } catch {
    // 잘못된 % 인코딩이면 그대로 둠 → API가 404로 답함
  }
  return value.replace(/^(\((\.{1,3}|\.\.\)\(\.\.)\))+/, "");
}

/**
 * /cases 안에서 서류철을 눌러 /cases/[slug]로 이동할 때(소프트 내비게이션)만 이 페이지가 가로채서 시트로 보여줌.
 * 주소를 직접 열거나 새로고침하면 가로채지 않고 app/cases/[slug]/page.tsx 전체 페이지가 뜸.
 */
export default function CaseSheetPage({ params }: PageProps<"/cases/[slug]">) {
  return (
    <BottomSheet label="사건 파일">
      <Suspense fallback={<CaseDetailSkeleton />}>
        {params.then(({ slug }) => (
          <CaseDetailView slug={stripInterceptionMarker(slug)} />
        ))}
      </Suspense>
    </BottomSheet>
  );
}
