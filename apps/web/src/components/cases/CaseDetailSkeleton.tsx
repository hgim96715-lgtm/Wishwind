/** 사건 파일 로딩 자리표시. "use cache"가 없는 파일이라 클라이언트 컴포넌트에서도 가져올 수 있음 */
export function CaseDetailSkeleton() {
  return (
    <div aria-busy className="animate-pulse space-y-4">
      <div className="h-4 w-48 rounded bg-line/70" />
      <div className="h-8 w-2/3 rounded bg-line/70" />
      <div className="mt-6 flex gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-5 w-14 rounded bg-line/50" />
        ))}
      </div>
      <div className="mt-6 h-48 rounded-2xl bg-surface/70" />
    </div>
  );
}
