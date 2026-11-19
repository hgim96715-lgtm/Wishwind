import Link from "next/link";
import { contactById, type HelpContact } from "@/lib/help/contacts";
import type { CaseDetail } from "@/lib/cases/types";
import { ContactCard } from "./ContactCard";

/** 나라별 이 사건 종류에 맞는 번호 id */
const BY_CATEGORY: Record<string, Partial<Record<string, string[]>>> = {
  KR: {
    MISSING: ["kr-182", "kr-112"],
    KIDNAPPING: ["kr-182", "kr-112"],
    SEXUAL_CRIME: ["kr-1366", "kr-d4u"],
  },
  US: { MISSING: ["us-ncmec"], KIDNAPPING: ["us-ncmec"], SEXUAL_CRIME: ["us-rainn"] },
  GB: { MISSING: ["gb-missing-people"], KIDNAPPING: ["gb-missing-people"] },
  JP: {},
};

function pick(data: CaseDetail): HelpContact[] {
  const ids: string[] = [];
  const child = data.victims.some((v) => v.age !== null && v.age < 18);
  const abroad = data.country !== "KR" && data.country in BY_CATEGORY;
  if (abroad) ids.push(...(BY_CATEGORY[data.country][data.category] ?? []));
  ids.push(...(BY_CATEGORY.KR[data.category] ?? []));
  if (child) ids.push(abroad && data.country === "JP" ? "jp-189" : "kr-112");
  if (ids.length === 0) ids.push("kr-112");
  return [...new Set(ids)]
    .map(contactById)
    .filter((c): c is HelpContact => Boolean(c))
    .slice(0, 3);
}

/** 사건 상세 아래 '알아 두면 좋은 번호'와 조용한 109 한 줄 */
export function CaseHelp({ data }: { data: CaseDetail }) {
  const list = pick(data);
  return (
    <section aria-labelledby="case-help-title" className="mt-10 rounded-2xl border border-line bg-[#fbf7ef] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="case-help-title" className="font-semibold">
          알아 두면 좋은 번호
        </h2>
        <Link href="/help" className="shrink-0 text-sm text-[#2f7469] hover:underline">
          도움받는 곳 전체 →
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">비슷한 일을 겪거나 보게 된다면 여기로 연락할 수 있습니다.</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {list.map((c) => (
          <ContactCard key={c.id} contact={c} compact />
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted">
        읽고 마음이 무거우면{" "}
        <a href="tel:109" className="font-semibold text-[#2f7469] hover:underline">
          109
        </a>
        에서 이야기를 들어 줍니다.
      </p>
    </section>
  );
}
