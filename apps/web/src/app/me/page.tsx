import type { Metadata } from "next";
import Link from "next/link";
import { HomeLogo } from "@/components/common/HomeLogo";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { fetchMe } from "@/lib/account/session";
import { NicknameForm } from "./NicknameForm";
import { WithdrawButton } from "./WithdrawButton";
import type { Me } from "@/lib/account/types";

export const metadata: Metadata = { title: "나의 기록", robots: { index: false, follow: false } };

const STATUS: Record<string, { label: string; tone: string }> = {
  PUBLISHED: { label: "공개", tone: "bg-[#e3f1ea] text-[#2f7a5b]" },
  HELD: { label: "확인 중", tone: "bg-[#fff4d6] text-[#8a6a1f]" },
  HIDDEN: { label: "숨김", tone: "bg-line/60 text-subtle" },
  BLOCKED: { label: "게시 안 됨", tone: "bg-[#fbe9e4] text-[#a3523f]" },
};
const PROVIDER = { NAVER: "네이버", GOOGLE: "구글" } as const;
const INQUIRY = { QUESTION: "문의", CORRECTION: "정정 요청", FEEDBACK: "의견" } as const;

const day = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(new Date(iso));

export default function MePage({ searchParams }: PageProps<"/me">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <HomeLogo />
      <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-subtle">Case Log</p>
      {/* 세션 쿠키로 요청마다 불러오는 부분 (제목의 닉네임 포함) */}
      <Suspense
        fallback={
          <>
            <h1 className="text-3xl font-semibold tracking-tight">기록</h1>
            <div className="mt-8 h-64 animate-pulse rounded-xl bg-line/50" />
          </>
        }
      >
        <MyLog searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function MyLog({ searchParams }: { searchParams: PageProps<"/me">["searchParams"] }) {
  // 사람마다 다른 화면(쿠키) → 요청 시점에 그린다고 먼저 알림. 이후의 API 호출·시각 계산이 미리 그리기(prerender)에 섞이지 않음
  await connection();
  const me = await fetchMe();
  if (!me) redirect("/login?next=/me");
  const sp = await searchParams;

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{me.nickname}님의 기록</h1>
      <NicknameForm initial={me.nickname} />
      <p className="mt-3 text-sm text-muted">
        {me.providers.map((p) => PROVIDER[p]).join("·")} 계정 · {day(me.joinedAt)}부터 함께하고 있습니다
      </p>
      {sp.error === "withdraw" && (
        <p className="mt-4 rounded-lg bg-[#fbe9e4] px-4 py-3 text-sm text-[#a3523f]">탈퇴하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      )}

      <Counts counts={me.counts} />

      <Section title="수사 노트 답변" empty="아직 남긴 답변이 없습니다. 사건 파일의 질문 탭에서 생각을 남겨 보세요.">
        {me.answers.map((a) => (
          <Item key={a.id} href={`/cases/${a.case.slug}`} meta={`${a.case.title} · ${day(a.createdAt)}`} status={a.status}>
            <span className="block text-xs text-subtle">Q. {a.question}</span>
            {a.body}
          </Item>
        ))}
      </Section>

      <Section title="내가 던진 질문" empty="아직 남긴 질문이 없습니다.">
        {me.questions.map((q) => (
          <Item
            key={q.id}
            href={`/cases/${q.case.slug}`}
            meta={`${q.case.title} · ${day(q.createdAt)} · 나도 궁금합니다 ${q.curiousCount}`}
            status={q.status}
          >
            {q.body}
          </Item>
        ))}
      </Section>

      <Section title="형량 의견" empty="아직 남긴 형량 의견이 없습니다.">
        {me.votes.map((v) => (
          <Item key={v.id} href={`/cases/${v.case.slug}`} meta={`${v.case.title} · ${day(v.createdAt)}`}>
            {v.penalty ? `${v.penalty}: ` : ""}
            {v.choice === "AGREE" ? "적절하다" : v.direction === "TOO_HARSH" ? "너무 무겁다" : v.direction === "TOO_LENIENT" ? "너무 가볍다" : "적절하지 않다"}
          </Item>
        ))}
      </Section>

      <Section title="꽂은 바람개비" empty="아직 꽂은 바람개비가 없습니다. 실종방 언덕에 응원 한 마디를 남겨 보세요.">
        {me.clouds.map((c) => (
          <Item key={c.id} href="/missing" meta={day(c.createdAt)} status={c.status}>
            {c.body}
          </Item>
        ))}
      </Section>

      {me.inquiries.length > 0 && (
        <Section title="문의·의견" empty="">
          {me.inquiries.map((q) => (
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
        </Section>
      )}

      <div className="mt-16 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="rounded-full border border-line bg-surface px-4 py-2 text-sm hover:bg-white">
            로그아웃
          </button>
        </form>
        <WithdrawButton />
        <p className="w-full text-xs leading-5 text-subtle">
          탈퇴하면 계정 연결 정보만 지워지고, 남긴 글은 익명 글로 남습니다. 글을 지우고 싶다면{" "}
          <Link href="/contact" className="underline underline-offset-2">
            문의하기
          </Link>
          로 알려 주세요.
        </p>
      </div>
    </>
  );
}

function Counts({ counts }: { counts: Me["counts"] }) {
  const items = [
    ["답변", counts.answers],
    ["질문", counts.questions],
    ["나도 궁금", counts.curious],
    ["형량 의견", counts.votes],
    ["바람개비", counts.clouds],
  ] as const;
  return (
    <dl className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5">
      {items.map(([label, n]) => (
        <div key={label} className="rounded-xl border border-line bg-surface px-3 py-3 text-center">
          <dt className="text-xs text-subtle">{label}</dt>
          <dd className="mt-1 font-mono text-xl font-semibold">{n}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children.length ? <ul className="mt-3 flex flex-col gap-2">{children}</ul> : <p className="mt-3 text-sm text-subtle">{empty}</p>}
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
