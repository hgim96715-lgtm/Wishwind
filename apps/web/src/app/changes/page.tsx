import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HomeLogo } from "@/components/common/HomeLogo";
import { CHANGE_KIND_LABEL, getChanges, observedLabel } from "@/lib/cases/changes";
import { COUNTRY_LABEL } from "@/lib/cases/labels";
import type { CaseChangeWithCase, ChangeKind } from "@/lib/cases/types";

export const metadata: Metadata = {
  alternates: { canonical: "/changes" },
  title: "사건이 바꾼 것들",
  description: "사건을 계기로 생긴 법과 기념일, 제도를 모았습니다. 무엇이 바뀌었는지 보고 사건 기록으로 이어 봅니다.",
};

const KIND_ORDER: ChangeKind[] = ["LAW", "SYSTEM", "DAY"];

export default function ChangesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
      <HomeLogo />
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-subtle">What changed</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">사건이 바꾼 것들</h1>
      <p className="mt-3 leading-7 text-muted">
        어떤 사건은 법이 되고, 기념일이 되고, 아이를 지키는 제도가 되었습니다. 우리가 지금 누리는 안전장치가 어떤 아픔에서 시작됐는지
        기억하려고 모았습니다. 이름을 누르면 그 사건 기록으로 갑니다.
      </p>
      <Suspense fallback={<p className="mt-10 text-sm text-subtle">불러오는 중입니다…</p>}>
        <ChangeList />
      </Suspense>
    </main>
  );
}

async function ChangeList() {
  const items = await getChanges();
  if (items.length === 0) {
    return <p className="mt-10 text-sm text-subtle">아직 정리된 내용이 없습니다. 곧 채워 넣겠습니다.</p>;
  }
  return (
    <div className="mt-10 space-y-10">
      {KIND_ORDER.map((kind) => {
        const group = items.filter((c) => c.kind === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind} aria-labelledby={`kind-${kind}`}>
            <h2 id={`kind-${kind}`} className="text-lg font-semibold">
              {kind === "LAW" ? "사건으로 생긴 법" : kind === "SYSTEM" ? "사건으로 생긴 제도" : "사건을 기억하는 날"}
              <span className="ml-2 text-sm font-normal text-subtle">{group.length}</span>
            </h2>
            <ul className="mt-4 space-y-4">
              {group.map((c) => (
                <ChangeItem key={c.id} c={c} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ChangeItem({ c }: { c: CaseChangeWithCase }) {
  const meta = [c.year ? `${c.year}년` : null, c.country ? COUNTRY_LABEL[c.country] : null, observedLabel(c.observedOn)].filter(Boolean);
  return (
    <li className="min-w-0 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="rounded-full bg-jade/15 px-2 py-0.5 text-xs font-medium text-jade-ink">{CHANGE_KIND_LABEL[c.kind]}</span>
        <h3 className="min-w-0 max-w-full break-words font-semibold [overflow-wrap:anywhere]">{c.name}</h3>
        {meta.length > 0 && <span className="text-xs text-subtle">{meta.join(" · ")}</span>}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{c.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <Link href={`/cases/${c.case.slug}`} className="font-medium text-jade-ink transition-opacity hover:opacity-70">
          {c.case.title} 기록 보기
        </Link>
        <a href={c.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-subtle transition-colors hover:text-foreground">
          출처: {c.sourceTitle}
        </a>
      </div>
    </li>
  );
}
