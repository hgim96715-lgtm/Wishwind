import type { Metadata } from "next";
import Link from "next/link";
import { HomeLogo } from "@/components/common/HomeLogo";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { fetchMe } from "@/lib/account/session";
import { MyRecords } from "./MyRecords";
import { NicknameForm } from "./NicknameForm";
import { WithdrawButton } from "./WithdrawButton";
import type { Me } from "@/lib/account/types";

export const metadata: Metadata = { title: "나의 기록", robots: { index: false, follow: false } };

const PROVIDER = { NAVER: "네이버", GOOGLE: "구글" } as const;

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
        <p className="mt-4 rounded-lg bg-clay-wash px-4 py-3 text-sm text-clay-ink-deep">탈퇴하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      )}

      <Counts counts={me.counts} />

      <MyRecords
        initial={{ answers: me.answers, questions: me.questions, votes: me.votes, clouds: me.clouds, inquiries: me.inquiries }}
        counts={me.counts}
      />

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
