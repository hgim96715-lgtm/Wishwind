import Link from "next/link";
import { INVESTIGATION_TECHNIQUES } from "@/lib/briefing/techniques";

/** 사건을 푸는 기술: 미제 사건이 풀리는 데 쓰인 수사 기법 6가지를 접어 둔 카드로 보여 줌 */
export function CaseSolvingTech() {
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
              <Link href={t.link.href} className="mt-2 inline-block text-xs font-medium text-[#4f78a8] hover:opacity-70">
                {t.link.label} →
              </Link>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
