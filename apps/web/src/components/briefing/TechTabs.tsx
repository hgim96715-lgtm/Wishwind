"use client";

import Link from "next/link";
import { useState } from "react";
import { LuBrush, LuDatabase, LuDna, LuFileSearch, LuHourglass, LuSmile } from "react-icons/lu";
import type { InvestigationTech, TechIcon } from "@/lib/briefing/techniques";

const ICON = { dna: LuDna, hourglass: LuHourglass, brush: LuBrush, database: LuDatabase, search: LuFileSearch, smile: LuSmile } as const;

/** 분류별 포인트 색. 사이트 팔레트 안에서 은은하게만 다르게 */
const TONE: Record<string, string> = {
  DNA: "#3f8f84",
  "실종 추적": "#c46a4b",
  법의학: "#4f78a8",
  데이터베이스: "#8a6a4a",
};

function TechIconView({ name, className }: { name: TechIcon; className?: string }) {
  const Icon = ICON[name];
  return <Icon aria-hidden className={className} />;
}

/** 위에는 기술 6개 칩, 아래에는 고른 기술의 설명 카드 하나와 관련 사건 칩 */
export function TechTabs({
  techs,
  initial,
  titles,
}: {
  techs: readonly InvestigationTech[];
  initial: number;
  /** 공개된 사건의 slug → 제목 */
  titles: Record<string, string>;
}) {
  const [index, setIndex] = useState(initial);
  const tech = techs[index];
  const color = TONE[tech.badge] ?? "#4f78a8";
  const related = tech.caseSlugs.filter((slug) => titles[slug]);

  return (
    <div className="mt-4">
      <div role="tablist" aria-label="사건을 푸는 기술" className="flex flex-wrap gap-2">
        {techs.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            id={`tech-tab-${t.id}`}
            aria-selected={i === index}
            aria-controls="tech-panel"
            type="button"
            onClick={() => setIndex(i)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              i === index ? "border-foreground bg-foreground font-semibold text-surface" : "border-line bg-surface hover:border-foreground/40"
            }`}
          >
            <TechIconView name={t.icon} className="size-3.5" />
            {t.shortTitle}
          </button>
        ))}
      </div>

      <article
        id="tech-panel"
        role="tabpanel"
        aria-labelledby={`tech-tab-${tech.id}`}
        className="mt-3 rounded-xl border bg-surface p-5"
        style={{ borderColor: `${color}55`, backgroundImage: `linear-gradient(135deg, ${color}12, transparent 55%)` }}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}22`, color }}>
            <TechIconView name={tech.icon} className="size-5" />
          </span>
          <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: `${color}22`, color }}>
            {tech.badge}
          </span>
        </div>
        <h3 className="mt-3 text-lg font-semibold leading-snug">{tech.title}</h3>
        <p className="mt-3 font-medium leading-7">{tech.definition}</p>
        <p className="mt-2 text-sm leading-7 text-muted">{tech.detail}</p>

        {related.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-xs font-semibold text-muted">관련 사건</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {related.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/cases?file=${encodeURIComponent(slug)}`}
                    className="inline-block rounded-full border bg-surface px-3 py-1 text-sm font-medium transition-colors hover:bg-background"
                    style={{ borderColor: `${color}66`, color }}
                  >
                    {titles[slug]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {tech.link && (
          <Link href={tech.link.href} className="mt-3 inline-block text-xs font-medium hover:opacity-70" style={{ color }}>
            {tech.link.label} →
          </Link>
        )}
      </article>
    </div>
  );
}
