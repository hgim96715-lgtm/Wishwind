import Link from "next/link";
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  STATUS_STAMP,
  formatCaseDate,
} from "@/lib/cases/labels";
import type { CaseListItem } from "@/lib/cases/types";
import { ReviewStamp } from "./StatusStamp";

/**
 * 책장에 꽂힌 서류철 하나 (책등만 보이는 상태).
 * 클릭 시 /cases/[slug]로 이동하지만, @modal 슬롯의 인터셉팅 라우트가 가로채서 바텀 시트로 열림.
 * scroll={false}: 시트가 열려도 책장 스크롤 위치를 유지함.
 */
export function FileSpine({ item, fileNo }: { item: CaseListItem; fileNo: number }) {
  const color = CATEGORY_COLOR[item.category];
  const stamp = STATUS_STAMP[item.status];
  // 제목 길이에 따라 책등 높이를 살짝 다르게 → 실제 책장처럼 들쭉날쭉한 느낌
  const height = 250 + (item.title.length % 4) * 14;
  // 긴 제목은 세로 2열로 줄바꿈되므로 책등을 넓힘
  const width = item.title.length > 8 ? "w-20" : "w-16";

  return (
    <Link
      href={`/cases/${item.slug}`}
      scroll={false}
      aria-label={`${item.title} (${CATEGORY_LABEL[item.category]}, ${stamp.label})`}
      title={item.summary}
      style={{ "--spine": color, height } as React.CSSProperties}
      className={`group relative flex ${width} flex-col items-center rounded-t-md rounded-b-sm bg-(--spine) px-1.5 pt-3 pb-2 text-white shadow-[inset_-6px_0_8px_rgb(0_0_0/0.18),inset_3px_0_4px_rgb(255_255_255/0.12)] outline-none transition-transform duration-300 ease-out hover:-translate-y-3 focus-visible:-translate-y-3 focus-visible:ring-4 focus-visible:ring-white/50`}
    >
      {/* 상단 상태 라벨 */}
      <span
        className="w-full rounded-sm bg-[#fbf7ef] py-0.5 text-center font-mono text-[10px] font-bold"
        style={{ color: stamp.color }}
      >
        {stamp.label}
      </span>

      {item.reviewPending && <ReviewStamp className="mt-1.5 scale-90" />}

      {/* 세로 제목 (writing-mode: vertical-rl → 한글은 똑바로 선 채로 위→아래) */}
      <span className="mt-3 min-h-0 flex-1 overflow-hidden text-[15px] leading-snug font-bold tracking-wider break-keep [writing-mode:vertical-rl]">
        {item.title}
      </span>

      {/* 하단 색인 */}
      <span className="mt-2 w-full border-t border-white/30 pt-1.5 text-center">
        <span className="block font-mono text-[9px] tracking-wider opacity-80">
          {String(fileNo).padStart(3, "0")}
        </span>
        <span className="block font-mono text-[9px] opacity-70">
          {formatCaseDate(item.occurredAt, "YEAR")}
        </span>
      </span>
    </Link>
  );
}
