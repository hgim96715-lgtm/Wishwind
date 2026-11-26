import Link from "next/link";
import { getCases, getHomeFeatured } from "@/lib/cases/api";
import { CATEGORY_COLOR, CATEGORY_LABEL, caseStamp } from "@/lib/cases/labels";

/**
 * 홈 하단 '지금 살펴볼 사건 3개': 국내 미제·장기 실종 위주로 3건 표시
 */
export async function FeaturedCases() {
  let items: Awaited<ReturnType<typeof getCases>>["items"] = [];
  try {
    // 관리실에서 지정한 대표 사건을 먼저, 모자라면 국내(KR) 미해결 사건으로 채움
    items = await getHomeFeatured();
    const krRes = await getCases({ country: "KR", status: "UNSOLVED" });
    const picked = new Set(items.map((i) => i.slug));
    for (const item of krRes.items) {
      if (items.length >= 3) break;
      if (!picked.has(item.slug)) items.push(item);
    }
    // 3건 미만이면 전체 미해결 사건에서 보충
    if (items.length < 3) {
      const allRes = await getCases({ status: "UNSOLVED" });
      const existing = new Set(items.map((i) => i.slug));
      for (const item of allRes.items) {
        if (!existing.has(item.slug)) items.push(item);
        if (items.length >= 3) break;
      }
    }
  } catch {
    return null;
  }
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="featured-cases-title" className="mt-10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2
          id="featured-cases-title"
          className="text-sm font-semibold uppercase tracking-widest text-subtle"
        >
          지금 살펴볼 사건
        </h2>
        <Link
          href="/cases"
          className="text-xs text-[#c46a4b] transition-opacity hover:opacity-70"
        >
          사건방 전체 보기
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((c) => {
          const stamp = caseStamp(c);
          return (
            <li key={c.slug}>
              <Link
                href={`/cases/${c.slug}`}
                className="block h-full rounded-xl border border-line bg-surface p-4 transition-colors hover:border-foreground/30"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="font-medium"
                    style={{ color: CATEGORY_COLOR[c.category] }}
                  >
                    {CATEGORY_LABEL[c.category]}
                  </span>
                  <span
                    className="rounded-full border px-1.5 py-px text-[10px]"
                    style={{ color: stamp.color, borderColor: `${stamp.color}55` }}
                  >
                    {stamp.label}
                  </span>
                </div>
                <p className="mt-2 font-semibold leading-snug">{c.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{c.summary}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
