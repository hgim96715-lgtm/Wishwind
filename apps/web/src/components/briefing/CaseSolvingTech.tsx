import { connection } from "next/server";
import { TechTabs } from "@/components/briefing/TechTabs";
import { INVESTIGATION_TECHNIQUES } from "@/lib/briefing/techniques";
import { getCase } from "@/lib/cases/api";

/** 사건을 푸는 기술: 기술 칩 6개와 설명 카드 1장. 처음에는 오늘 날짜로 돌아가며 한 기술이 선택됨 */
export async function CaseSolvingTech() {
  await connection();
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const initial = (kst.getUTCFullYear() * 365 + kst.getUTCMonth() * 30 + kst.getUTCDate()) % INVESTIGATION_TECHNIQUES.length;

  // 공개된 사건만 칩으로 보이도록 slug로 직접 조회함 (목록 take 제한·정렬과 무관하게 찾음, 실패하면 해당 칩만 생략)
  const titles: Record<string, string> = {};
  const slugs = [...new Set(INVESTIGATION_TECHNIQUES.flatMap((t) => t.caseSlugs))];
  await Promise.all(
    slugs.map(async (slug) => {
      try {
        const c = await getCase(slug);
        if (c) titles[slug] = c.title;
      } catch {}
    }),
  );

  return (
    <section aria-labelledby="tech-title" className="mt-8">
      <h2 id="tech-title" className="font-mono text-xs uppercase tracking-[0.2em] text-subtle">
        How Cases Get Solved
      </h2>
      <p className="mt-2 text-lg font-semibold">사건을 푸는 기술</p>
      <TechTabs techs={INVESTIGATION_TECHNIQUES} initial={initial} titles={titles} />
    </section>
  );
}
