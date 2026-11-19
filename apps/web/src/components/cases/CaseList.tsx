import { ApiUnavailableError, InvalidQueryError, getCases } from "@/lib/cases/api";
import { hasActiveFilters, type CaseFilters } from "@/lib/cases/filters";
import { Bookshelf } from "./Bookshelf";
import { Notice } from "./Notice";

/** 요청마다 최신 목록을 가져오는 서버 컴포넌트. 페이지에서 Suspense로 감싸서 씀 */
export async function CaseList({ filters }: { filters: CaseFilters }) {
  let data;
  try {
    data = await getCases(filters);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return (
        <Notice title="수사 본부와 연결이 끊겼습니다">
          API 서버가 꺼져 있는 것 같습니다. <code>pnpm dev:api</code>로 서버를
          켠 뒤 새로고침해 주세요.
        </Notice>
      );
    }
    if (error instanceof InvalidQueryError) {
      return <Notice title="검색 조건을 다시 확인해 주세요">{error.message}</Notice>;
    }
    throw error;
  }

  const filtered = hasActiveFilters(filters);

  if (data.items.length === 0) {
    return filtered ? (
      <Notice title="조건에 맞는 사건 파일이 없습니다">
        검색어나 필터를 바꿔서 다시 찾아보세요.
      </Notice>
    ) : (
      <Notice title="아직 등록된 사건 파일이 없습니다">
        <code>pnpm db:seed</code>로 예시 사건을 넣어 볼 수 있습니다.
      </Notice>
    );
  }

  return (
    <>
      {filtered && (
        <p aria-live="polite" className="mb-6 text-sm text-muted">
          찾은 사건 파일 <span className="font-semibold text-foreground">{data.items.length}</span>건
        </p>
      )}
      <Bookshelf items={data.items} />
    </>
  );
}

export function CaseListSkeleton() {
  return (
    <div aria-busy className="space-y-12">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i}>
          <div className="mb-3 h-7 w-24 animate-pulse rounded-md bg-line/70" />
          <div className="h-64 animate-pulse rounded-xl bg-[#e2d2b8]/70" />
        </div>
      ))}
    </div>
  );
}
