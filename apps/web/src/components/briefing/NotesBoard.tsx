import Link from "next/link";
import type { Briefing } from "@/lib/briefing/api";

/** 메모지 색과 기울기. 종이 톤 안에서 살짝씩만 다르게 */
const PAPERS = [
  { bg: "#fbf3d9", tilt: "sm:-rotate-2" },
  { bg: "#e8f0e9", tilt: "sm:rotate-1" },
  { bg: "#f6e6dc", tilt: "sm:rotate-2" },
  { bg: "#e6ecf3", tilt: "sm:-rotate-1" },
];

function Pin({ color = "#c4473b" }: { color?: string }) {
  return (
    <span aria-hidden className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
      <span
        className="block size-3.5 rounded-full shadow-[0_2px_2px_rgb(0_0_0/0.25)]"
        style={{ background: `radial-gradient(circle at 35% 35%, #fff8 0 20%, ${color} 45%)` }}
      />
    </span>
  );
}

function Memo({ index, children }: { index: number; children: React.ReactNode }) {
  const paper = PAPERS[index % PAPERS.length];
  return (
    <li
      className={`relative rounded-sm p-4 pt-5 text-sm shadow-[0_2px_6px_rgb(47_44_40/0.12)] motion-safe:transition-transform motion-safe:hover:rotate-0 ${paper.tilt}`}
      style={{ backgroundColor: paper.bg }}
    >
      <Pin color={index % 2 ? "#4f78a8" : "#3f8f84"} />
      {children}
    </li>
  );
}

/** 사람들의 생각: 코르크보드에 오늘의 질문을 꽂고, 주변에 수사 노트·실종방 응원을 메모지로 붙임 */
export function NotesBoard({
  board,
  participation,
}: {
  board: Briefing["board"];
  participation: Briefing["participation"];
}) {
  const { question, notes, cheers } = board;
  const memos = [
    ...notes.map((n) => ({ kind: "note" as const, ...n })),
    ...cheers.map((c) => ({ kind: "cheer" as const, ...c })),
  ].slice(0, 4);

  return (
    <section aria-labelledby="voices-title" className="mt-8">
      <h2 id="voices-title" className="font-mono text-xs uppercase tracking-[0.2em] text-subtle">
        Investigation Notes
      </h2>
      <p className="mt-2 text-lg font-semibold">사람들의 생각</p>

      <div className="mt-4 rounded-xl border border-[#cdb999] bg-[#d9c4a0] bg-[radial-gradient(rgb(120_90_50/0.18)_1px,transparent_1.5px)] bg-[length:9px_9px] p-4 shadow-[inset_0_1px_4px_rgb(80_60_30/0.2)] sm:p-6">
        {question && (
          <div className="relative mx-auto max-w-md rounded-sm bg-[#fffdf8] px-5 pb-4 pt-6 text-center shadow-[0_3px_8px_rgb(47_44_40/0.18)]">
            <Pin />
            <p className="font-mono text-[11px] tracking-[0.18em] text-[#c46a4b]">오늘의 질문</p>
            <p className="mt-2 font-serif text-lg font-bold leading-snug">{question.question}</p>
            <Link href={`/cases/${question.caseSlug}`} className="mt-2 inline-block text-xs text-muted transition-colors hover:text-foreground">
              📁 {question.caseTitle}에서 나온 질문
            </Link>
          </div>
        )}

        {memos.length > 0 ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {memos.map((m, i) => (
              <Memo key={m.id} index={i}>
                {m.kind === "note" ? (
                  <>
                    <p className="leading-relaxed">“{m.body}”</p>
                    <Link href={`/cases/${m.caseSlug}`} className="mt-2 block text-xs text-muted transition-colors hover:text-foreground">
                      {m.forToday ? "오늘의 질문에 남긴 수사 노트" : `${m.caseTitle} · 수사 노트`}
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="leading-relaxed">“{m.body}”</p>
                    <Link href="/missing" className="mt-2 block text-xs text-muted transition-colors hover:text-foreground">
                      실종방 응원
                    </Link>
                  </>
                )}
              </Memo>
            ))}
          </ul>
        ) : (
          !question && (
            <ul className="mx-auto max-w-xs">
              <Memo index={0}>
                <p className="text-center leading-relaxed">아직 남겨진 생각이 없습니다. 사건방에서 첫 생각을 남겨 주세요.</p>
                <Link href="/cases" className="mt-2 block text-center text-xs text-muted transition-colors hover:text-foreground">
                  사건방으로 가기
                </Link>
              </Memo>
            </ul>
          )
        )}

        {question && notes.length === 0 && (
          <div className="mt-5 text-center">
            <Link
              href={`/cases/${question.caseSlug}`}
              className="inline-block rounded-full bg-[#fffdf8] px-4 py-2 text-sm font-medium shadow-[0_1px_3px_rgb(47_44_40/0.15)] hover:bg-white"
            >
              첫 생각을 남겨 주세요
            </Link>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-subtle">
        지금까지 수사 노트 {participation.answers + participation.questions}개, 실종방 응원 {participation.clouds}개가 모였습니다.
      </p>
    </section>
  );
}
