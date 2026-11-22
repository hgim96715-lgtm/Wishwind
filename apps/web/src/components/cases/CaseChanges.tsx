import Link from "next/link";
import { CHANGE_KIND_LABEL, observedLabel } from "@/lib/cases/changes";
import type { CaseChange } from "@/lib/cases/types";

/** 사건 개요 아래 '이 사건 뒤에 바뀐 것': 사건을 계기로 생긴 법·기념일·제도 */
export function CaseChanges({ items }: { items: CaseChange[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="이 사건 뒤에 바뀐 것" className="rounded-xl border border-[#3f8f84]/30 bg-[#3f8f84]/10 p-4">
      <h3 className="text-sm font-semibold text-[#2f7469]">이 사건 뒤에 바뀐 것</h3>
      <ul className="mt-3 space-y-3">
        {items.map((c) => (
          <li key={c.id} className="text-sm leading-6">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="rounded-full bg-[#3f8f84]/15 px-2 py-0.5 text-xs font-medium text-[#2f7469]">{CHANGE_KIND_LABEL[c.kind]}</span>
              <span className="font-semibold">{c.name}</span>
              <span className="text-xs text-subtle">{[c.year ? `${c.year}년` : null, observedLabel(c.observedOn)].filter(Boolean).join(" · ")}</span>
            </div>
            <p className="mt-1 text-muted">{c.description}</p>
            <a href={c.sourceUrl} target="_blank" rel="noreferrer noopener" className="mt-0.5 inline-block text-xs text-subtle transition-colors hover:text-foreground">
              출처: {c.sourceTitle}
            </a>
          </li>
        ))}
      </ul>
      <Link href="/changes" className="mt-3 inline-block text-xs font-medium text-[#2f7469] transition-opacity hover:opacity-70">
        사건이 바꾼 것들 모두 보기
      </Link>
    </section>
  );
}
