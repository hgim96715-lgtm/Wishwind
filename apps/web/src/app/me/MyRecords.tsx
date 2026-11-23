"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActivityKind, Me } from "@/lib/account/types";

const STATUS: Record<string, { label: string; tone: string }> = {
  PUBLISHED: { label: "공개", tone: "bg-[#e3f1ea] text-[#2f7a5b]" },
  HELD: { label: "확인 중", tone: "bg-[#fff4d6] text-[#8a6a1f]" },
  HIDDEN: { label: "숨김", tone: "bg-line/60 text-subtle" },
  BLOCKED: { label: "게시 안 됨", tone: "bg-[#fbe9e4] text-[#a3523f]" },
};
const INQUIRY = { QUESTION: "문의", CORRECTION: "정정 요청", FEEDBACK: "의견" } as const;
const day = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(iso));

type Lists = Pick<Me, ActivityKind>;

const TABS: { kind: ActivityKind; label: string; empty: string }[] = [
  { kind: "answers", label: "수사 노트 답변", empty: "아직 남긴 답변이 없습니다. 사건 파일의 질문 탭에서 생각을 남겨 보세요." },
  { kind: "questions", label: "내가 던진 질문", empty: "아직 남긴 질문이 없습니다." },
  { kind: "votes", label: "형량 의견", empty: "아직 남긴 형량 의견이 없습니다." },
  { kind: "clouds", label: "꽂은 바람개비", empty: "아직 꽂은 바람개비가 없습니다. 실종자들의 정원에 응원 한 마디를 남겨 보세요." },
  { kind: "inquiries", label: "문의·의견", empty: "아직 보낸 문의가 없습니다." },
];
/** 처음 받은 목록 수 (API의 최근 개수와 같음). 이보다 적으면 더 불러올 것이 없음 */
const FIRST_PAGE = 20;

/**
 * 나의 기록: 칸마다 탭으로 나눠 한 번에 하나만 보여 줌 (기록이 많아도 페이지가 길어지지 않게).
 * 처음엔 최근 20개, 「더 불러오기」로 20개씩 이어서 가져옴
 */
export function MyRecords({ initial, counts }: { initial: Lists; counts: Me["counts"] }) {
  const [tab, setTab] = useState<ActivityKind>("answers");
  const [lists, setLists] = useState<Lists>(initial);
  const [more, setMore] = useState<Record<ActivityKind, boolean>>(() => {
    const m = {} as Record<ActivityKind, boolean>;
    for (const t of TABS) m[t.kind] = initial[t.kind].length >= FIRST_PAGE;
    return m;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = async () => {
    const list = lists[tab];
    const last = list[list.length - 1];
    if (!last) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/activity?kind=${tab}&before=${encodeURIComponent(last.createdAt)}`);
      const data = (await res.json()) as { items?: Lists[ActivityKind]; hasMore?: boolean; message?: string };
      if (!res.ok || !data.items) throw new Error(data.message ?? "더 불러오지 못했습니다.");
      setLists((prev) => ({ ...prev, [tab]: [...prev[tab], ...data.items!] }));
      setMore((prev) => ({ ...prev, [tab]: !!data.hasMore }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "더 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const current = TABS.find((t) => t.kind === tab)!;
  const items = lists[tab];

  return (
    <section className="mt-12">
      <div role="tablist" aria-label="나의 기록" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            role="tab"
            aria-selected={tab === t.kind}
            onClick={() => {
              setTab(t.kind);
              setError(null);
            }}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              tab === t.kind ? "border-foreground bg-foreground text-surface" : "border-line bg-surface text-muted hover:bg-white hover:text-foreground"
            }`}
          >
            {t.label}
            <span className="ml-1.5 tabular-nums opacity-70">{counts[t.kind].toLocaleString("ko-KR")}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-4">
        {items.length === 0 ? (
          <p className="text-sm text-subtle">{current.empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tab === "answers" &&
              lists.answers.map((a) => (
                <Item key={a.id} href={`/cases/${a.case.slug}`} meta={`${a.case.title} · ${day(a.createdAt)}`} status={a.status}>
                  <span className="block text-xs text-subtle">Q. {a.question}</span>
                  {a.body}
                </Item>
              ))}
            {tab === "questions" &&
              lists.questions.map((q) => (
                <Item
                  key={q.id}
                  href={`/cases/${q.case.slug}`}
                  meta={`${q.case.title} · ${day(q.createdAt)} · 나도 궁금합니다 ${q.curiousCount}`}
                  status={q.status}
                >
                  {q.body}
                </Item>
              ))}
            {tab === "votes" &&
              lists.votes.map((v) => (
                <Item key={v.id} href={`/cases/${v.case.slug}`} meta={`${v.case.title} · ${day(v.createdAt)}`}>
                  {v.penalty ? `${v.penalty}: ` : ""}
                  {v.choice === "AGREE" ? "적절하다" : v.direction === "TOO_HARSH" ? "너무 무겁다" : v.direction === "TOO_LENIENT" ? "너무 가볍다" : "적절하지 않다"}
                </Item>
              ))}
            {tab === "clouds" &&
              lists.clouds.map((c) => (
                <Item key={c.id} href="/missing" meta={day(c.createdAt)} status={c.status}>
                  {c.body}
                </Item>
              ))}
            {tab === "inquiries" &&
              lists.inquiries.map((q) => (
                <li key={q.id} className="rounded-xl border border-line bg-surface px-4 py-3">
                  <span className="block text-[15px] leading-6">{q.body}</span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-subtle">
                    {q.reply ? (
                      <span className="rounded bg-[#e3f1ea] px-1.5 py-0.5 font-medium text-[#2f7a5b]">답변이 왔습니다</span>
                    ) : (
                      <span className="rounded bg-line/60 px-1.5 py-0.5">답변을 기다리는 중</span>
                    )}
                    {INQUIRY[q.kind]} · {day(q.createdAt)}
                  </span>
                  {q.reply && (
                    <div className="mt-3 rounded-lg border-l-2 border-[#3f8f84] bg-[#3f8f84]/5 px-3 py-2 text-sm leading-6">
                      <span className="block text-xs font-semibold text-[#2f7a5b]">
                        Wishwind 답변{q.repliedAt && ` · ${day(q.repliedAt)}`}
                      </span>
                      <span className="mt-1 block whitespace-pre-wrap">{q.reply}</span>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        )}
        {more[tab] && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="mt-3 w-full rounded-xl border border-dashed border-line py-2.5 text-sm text-muted transition-colors hover:bg-white hover:text-foreground"
          >
            {loading ? "불러오는 중입니다" : `더 불러오기 (${items.length.toLocaleString("ko-KR")} / ${counts[tab].toLocaleString("ko-KR")})`}
          </button>
        )}
        {error && <p className="mt-2 text-xs text-[#a3523f]">{error}</p>}
      </div>
    </section>
  );
}

function Item({ href, meta, status, children }: { href: string; meta: string; status?: string; children: React.ReactNode }) {
  const s = status ? STATUS[status] : undefined;
  return (
    <li>
      <Link href={href} className="block rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:bg-white">
        <span className="block text-[15px] leading-6">{children}</span>
        <span className="mt-1 flex items-center gap-2 text-xs text-subtle">
          {s && <span className={`rounded px-1.5 py-0.5 ${s.tone}`}>{s.label}</span>}
          {meta}
        </span>
      </Link>
    </li>
  );
}
