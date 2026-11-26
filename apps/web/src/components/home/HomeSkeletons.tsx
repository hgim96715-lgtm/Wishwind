/** 홈 Suspense fallback: 실제 카드와 같은 크기의 자리표시자라 로딩이 끝나도 레이아웃이 밀리지 않음 */
const bar = "animate-pulse rounded bg-line/70";

export function AccountLinkSkeleton() {
  return <span aria-hidden className="inline-block h-[34px] w-24 animate-pulse rounded-full bg-line/70" />;
}

export function ReelCasesSkeleton() {
  return (
    <section aria-hidden className="mb-8">
      <div className={`${bar} h-5 w-44`} />
      <div className="mt-3 flex gap-3 overflow-hidden pb-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[8.5rem] min-w-[15rem] flex-1 animate-pulse rounded-2xl border border-line bg-surface" />
        ))}
      </div>
    </section>
  );
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
