import { COUNTRY_LABEL, COUNTRY_ORDER } from "@/lib/cases/labels";
import type { CaseListItem, Country } from "@/lib/cases/types";
import { FileSpine } from "./FileSpine";

/** 국가별로 묶음. 정렬은 COUNTRY_ORDER, 같은 책장 안은 API 순서(최신 발생일순) 유지 */
function groupByCountry(items: CaseListItem[]) {
  const map = new Map<Country, CaseListItem[]>();
  for (const item of items) {
    const list = map.get(item.country) ?? [];
    list.push(item);
    map.set(item.country, list);
  }
  return [...map.entries()].sort(
    ([a], [b]) => COUNTRY_ORDER.indexOf(a) - COUNTRY_ORDER.indexOf(b),
  );
}

export function Bookshelf({ items }: { items: CaseListItem[] }) {
  let fileNo = 0;
  return (
    <div className="space-y-12">
      {groupByCountry(items).map(([country, cases]) => (
        <section key={country} aria-labelledby={`shelf-${country}`}>
          {/* 책장 이름표 */}
          <div className="mb-3 flex items-end justify-between px-1">
            <h2
              id={`shelf-${country}`}
              className="inline-flex items-center gap-2 rounded-md border border-[#8a6a4a]/30 bg-[#f6ecdc] px-3 py-1 text-sm font-bold shadow-[0_1px_0_rgb(47_44_40/0.08)]"
            >
              {COUNTRY_LABEL[country]}
            </h2>
            <span className="font-mono text-xs text-subtle">
              {cases.length} FILES
            </span>
          </div>

          {/* 책장 본체: 뒷판 + 선반. 모바일에서는 가로 스크롤 */}
          <div className="rounded-xl border-x-[10px] border-t-[10px] border-[#b08b66] bg-[#e2d2b8] shadow-[inset_0_10px_18px_rgb(91_70_52/0.28)]">
            <ul className="flex snap-x items-end gap-1.5 overflow-x-auto px-4 pt-6 [scrollbar-width:thin]">
              {cases.map((item) => (
                <li key={item.id} className="snap-start">
                  <FileSpine item={item} fileNo={++fileNo} />
                </li>
              ))}
            </ul>
            {/* 선반 판 */}
            <div
              aria-hidden
              className="h-4 rounded-b-md bg-gradient-to-b from-[#c09a73] to-[#a07b57] shadow-[0_6px_12px_rgb(47_44_40/0.25)]"
            />
          </div>
        </section>
      ))}
    </div>
  );
}
