import { formatMissingDate, type RegionGroup } from "@/lib/missing/regions";

/**
 * 움직임 줄이기 설정, WebGL 미지원, "목록으로 보기"일 때 쓰는 등불 카드 목록.
 * 지역으로 나누지 않고 최근 실종 순서로 한데 보여 줌 (언덕의 등불 순서와 같음)
 */
export function MissingList({ groups, onSelect }: { groups: RegionGroup[]; onSelect: (id: string, regionLabel: string) => void }) {
  const people = groups
    .flatMap((g) => g.people.map((p) => ({ p, label: g.label })))
    .sort((a, b) => (b.p.missingDate ?? "").localeCompare(a.p.missingDate ?? ""));
  return (
    <div className="mx-auto w-full max-w-4xl px-6 pt-28 pb-16">
      <h2 className="text-sm font-semibold text-[#7a6650]">아직 찾고 있는 사람 · {people.length}명</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {people.map(({ p, label }) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p.id, label)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white/70 p-3 text-left shadow-sm transition-colors hover:bg-white"
            >
              <span aria-hidden className="size-3 shrink-0 rounded-full bg-[#ffc76b] shadow-[0_0_10px_#ffc76b]" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-xs text-muted">
                  {formatMissingDate(p.missingDate)} · {p.lastSeenPlace ?? label}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
