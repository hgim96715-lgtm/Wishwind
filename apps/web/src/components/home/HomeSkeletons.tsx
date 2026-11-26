/** 홈 Suspense fallback: 실제 카드와 같은 크기의 자리표시자라 로딩이 끝나도 레이아웃이 밀리지 않음 */
const bar = "animate-pulse rounded bg-line/70";

export function AccountLinkSkeleton() {
  return <span aria-hidden className="inline-block h-[34px] w-24 animate-pulse rounded-full bg-line/70" />;
}

export function DidYouKnowSkeleton() {
  return (
    <div aria-hidden className="mb-6 h-[9.5rem] rounded-xl border border-line bg-surface px-4 py-3 sm:px-5">
      <div className={`${bar} h-3 w-24`} />
      <div className={`${bar} mt-3 h-5 w-1/2`} />
      <div className={`${bar} mt-3 h-3 w-full`} />
      <div className={`${bar} mt-2 h-3 w-3/4`} />
    </div>
  );
}

export function FeaturedCasesSkeleton() {
  return (
    <section aria-hidden className="mt-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">지금 살펴볼 사건</h2>
        <span className="text-sm text-muted">사건방 전체 보기</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="min-h-[7.5rem] rounded-xl border border-line bg-surface p-4">
            <div className={`${bar} h-3 w-1/3`} />
            <div className={`${bar} mt-3 h-4 w-4/5`} />
            <div className={`${bar} mt-3 h-3 w-full`} />
            <div className={`${bar} mt-2 h-3 w-2/3`} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TodayTechCardSkeleton() {
  return (
    <div aria-hidden className="mt-6 h-32 rounded-xl border border-line bg-surface px-4 py-3 sm:px-5">
      <div className={`${bar} h-3 w-28`} />
      <div className={`${bar} mt-3 h-5 w-2/5`} />
      <div className={`${bar} mt-3 h-3 w-full`} />
    </div>
  );
}
