import { formatMissingDate, type RegionGroup } from "@/lib/missing/regions";

/** 움직임 줄이기 설정, WebGL 미지원, "목록으로 보기"일 때 쓰는 구름 카드 목록 */
export function MissingList({ groups, onSelect }: { groups: RegionGroup[]; onSelect: (id: string, regionLabel: string) => void }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 px-6 pt-28 pb-16">
      {groups.map((g) => (
        <section key={g.region} aria-labelledby={`r-${g.region}`}>
          <h2 id={`r-${g.region}`} className="text-sm font-semibold text-[#7a6650]">
            {g.label} · {g.people.length}명
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {g.people.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id, g.label)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white/70 p-3 text-left shadow-sm transition-colors hover:bg-white"
                >
                  <span aria-hidden className="size-3 shrink-0 rounded-full bg-[#ffc76b] shadow-[0_0_10px_#ffc76b]" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {formatMissingDate(p.missingDate)} · {p.lastSeenPlace ?? "장소 미상"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
