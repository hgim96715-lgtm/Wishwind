import Link from "next/link";
import { INVESTIGATION_TECHNIQUES } from "@/lib/briefing/techniques";
import { getCases } from "@/lib/cases/api";

/** 사건을 푸는 기술: 미제 사건이 풀리는 데 쓰인 수사 기법 6가지를 접어 둔 카드로 보여 줌 */
export async function CaseSolvingTech() {
  // 공개된 사건만 이름을 붙여 보여 주기 위해 목록에서 제목을 찾음 (실패하면 사건 칩만 생략)
  const titles = new Map<string, string>();
  try {
    for (const c of (await getCases()).items) titles.set(c.slug, c.title);
  } catch {}

  return (
    <section aria-labelledby="tech-title" className="mt-8">
      <h2 id="tech-title" className="font-mono text-xs uppercase tracking-[0.2em] text-subtle">
        How Cases Get Solved
      </h2>
      <p className="mt-2 text-lg font-semibold">사건을 푸는 기술</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {INVESTIGATION_TECHNIQUES.map((t) => (
          <li key={t.id} className="rounded-xl border border-[#4f78a8]/30 bg-[#4f78a8]/5 p-4">
            <details className="group">
              <summary className="cursor-pointer list-none">
                <span className="block font-semibold">{t.title}</span>
                <span className="mt-1 block text-sm leading-6 text-muted">{t.definition}</span>
                <span className="mt-2 block text-xs font-medium text-[#4f78a8] group-open:hidden">자세히 ↓</span>
                <span className="mt-2 hidden text-xs font-medium text-[#4f78a8] group-open:block">접기 ↑</span>
              </summary>
              <p className="mt-3 text-sm leading-6">{t.detail}</p>
              {t.caseSlugs.some((slug) => titles.has(slug)) && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-muted">관련 사건</p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {t.caseSlugs
                      .filter((slug) => titles.has(slug))
                      .map((slug) => (
                        <li key={slug}>
                          <Link
                            href={`/cases?file=${encodeURIComponent(slug)}`}
                            className="inline-block rounded-full border border-[#4f78a8]/40 bg-surface px-2.5 py-1 text-xs font-medium text-[#4f78a8] hover:bg-[#4f78a8]/10"
                          >
                            {titles.get(slug)}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {t.link && (
                <Link href={t.link.href} className="mt-2 inline-block text-xs font-medium text-[#4f78a8] hover:opacity-70">
                  {t.link.label} →
                </Link>
              )}
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
