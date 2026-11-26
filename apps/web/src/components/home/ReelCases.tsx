import Link from "next/link";
import { getReelCases } from "@/lib/cases/api";
import { CATEGORY_LABEL } from "@/lib/cases/labels";

/** 인스타 릴스를 보고 프로필 링크로 들어온 사람이 홈에서 방금 본 사건을 바로 열 수 있게 함 (관리실 '인스타 성과'에 사건 주소를 적은 릴스 기준) */
export async function ReelCases() {
  let items: Awaited<ReturnType<typeof getReelCases>> = [];
  try {
    items = await getReelCases();
  } catch {
    return null;
  }
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="reel-cases-title" className="mb-8">
      <h2 id="reel-cases-title" className="text-sm font-semibold tracking-widest text-subtle uppercase">
        릴스에서 본 사건
      </h2>
      <p className="mt-1 text-xs text-muted">인스타그램 릴스에서 다룬 사건을 바로 열어 보세요.</p>
      <ul className="mt-3 space-y-2">
        {items.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/cases/${c.slug}`}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-foreground/30"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{c.title}</span>
                <span className="block truncate text-xs text-muted">{CATEGORY_LABEL[c.category]}</span>
              </span>
              <span aria-hidden className="text-sm text-brand-fg">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
