import { STATUS_STAMP } from "@/lib/cases/labels";
import type { CaseStatus } from "@/lib/cases/types";

/** 사건 파일 위에 찍힌 도장 느낌의 상태 표시 */
export function StatusStamp({
  status,
  className = "",
}: {
  status: CaseStatus;
  className?: string;
}) {
  const stamp = STATUS_STAMP[status];
  return (
    <span
      style={{ "--stamp": stamp.color } as React.CSSProperties}
      className={`inline-flex rotate-6 items-center rounded-md border-2 border-(--stamp)/55 px-2 py-0.5 font-mono text-[11px] font-bold tracking-[0.15em] text-(--stamp) ${className}`}
    >
      {stamp.label}
    </span>
  );
}

/** 개발 환경 미리보기에서 아직 검토가 끝나지 않은 사건에 찍는 도장 */
export function ReviewStamp({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex -rotate-6 items-center rounded-md border-2 border-[#b4483a]/70 bg-[#fbf7ef] px-1.5 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap text-[#b4483a] ${className}`}
    >
      검토 필요
    </span>
  );
}
