import Link from "next/link";
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  caseStamp,
  formatCaseDate,
} from "@/lib/cases/labels";
import type { CaseListItem } from "@/lib/cases/types";
import { ReviewStamp } from "./StatusStamp";

/** 책등에 들어가는 짧은 제목: 괄호 속 별칭과 끝의 '사건'을 뺌 (전체 제목은 aria-label·시트에 그대로 있음) */
export function spineTitle(title: string) {
  const short = title
    .replace(/\s*[(（][^)）]*[)）]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+사건$/, "");
  return short || title;
}

/** 세로쓰기에서 글자가 차지하는 길이 (em 단위). 공백은 반 글자로 셈 */
function verticalLength(text: string) {
  let em = 0;
  for (const ch of text) em += ch === " " ? 0.5 : 1.05; // tracking-wider(0.05em) 포함
  return em;
}

/**
 * 책등 높이 안에 제목이 들어가도록 글자 크기와 열 수를 정함.
 * - 1열에 15px~12px로 들어가면 1열 (가장 읽기 쉬움)
 * - 안 들어가면 2열로 나누고, 2열에도 안 들어가는 크기면 더 줄임
 * 열은 오른쪽에서 왼쪽으로 읽히므로(vertical-rl) 3열 이상은 만들지 않음
 */
function spineLayout(text: string, available: number) {
  const em = verticalLength(text);
  for (const size of [15, 14, 13, 12]) {
    if (em * size <= available) return { fontSize: size, columns: 1 };
  }
  for (const size of [14, 13, 12, 11]) {
    if ((em * size) / 2 + size <= available) return { fontSize: size, columns: 2 };
  }
  return { fontSize: 11, columns: 2 };
}

/**
 * 책장에 꽂힌 서류철 하나 (책등만 보이는 상태).
 * 클릭 시 /cases/[slug]로 이동하지만, @modal 슬롯의 인터셉팅 라우트가 가로채서 바텀 시트로 열림.
 * scroll={false}: 시트가 열려도 책장 스크롤 위치를 유지함.
 */
export function FileSpine({ item, fileNo }: { item: CaseListItem; fileNo: number }) {
  const color = CATEGORY_COLOR[item.category];
  const stamp = caseStamp(item);
  // 제목 길이에 따라 책등 높이를 살짝 다르게 → 실제 책장처럼 들쭉날쭉한 느낌
  const height = 250 + (item.title.length % 4) * 14;
  const label = spineTitle(item.title);
  // 상태 라벨·검토 도장·하단 색인을 뺀 나머지 높이가 제목 자리
  const available = height - 112 - (item.reviewPending ? 28 : 0);
  const { fontSize, columns } = spineLayout(label, available);
  const width = columns === 2 ? "w-[4.5rem]" : "w-16";

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

      {/* 세로 제목 (writing-mode: vertical-rl → 위→아래). text-orientation: upright로 숫자·영문도 눕지 않고 한 글자씩 세움.
          break-keep을 쓰면 낱말 단위로 넘어가 열 끝에 빈칸이 크게 생기므로, 2열일 때도 글자 단위로 채움 */}
      <span
        aria-hidden
        style={{ fontSize }}
        className="mt-3 min-h-0 flex-1 overflow-hidden leading-snug font-bold tracking-wider [writing-mode:vertical-rl] [text-orientation:upright]"
      >
        {label}
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
