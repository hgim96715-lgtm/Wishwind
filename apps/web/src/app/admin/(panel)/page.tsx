import Link from "next/link";
import { Suspense } from "react";
import { Card, ErrorBox, PageTitle, Skeleton } from "@/components/admin/ui";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { Analytics, Overview } from "@/lib/admin/types";

export default function AdminHome() {
  return (
    <>
      <PageTitle title="한눈에 보기" description="지금 손봐야 할 일을 모아 보여 줍니다." />
      <Suspense fallback={<Skeleton />}>
        <OverviewCards />
      </Suspense>
    </>
  );
}

/** 2026-11-22T16:52:00Z → '11월 23일 오전 1시 52분' (한국 시간) */
function kstTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Stat({ href, label, value, hint, alert }: { href: string; label: string; value: number; hint?: string; alert?: boolean }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-line bg-surface p-4 transition-colors hover:border-foreground/40"
    >
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${alert && value > 0 ? "text-clay-ink" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </Link>
  );
}

async function OverviewCards() {
  let data: Overview;
  let analytics: Analytics;
  try {
    [data, analytics] = await Promise.all([adminGet<Overview>("/overview"), adminGet<Analytics>("/analytics?days=7")]);
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  return (
    <div className="space-y-6">
      {data.cases.autoImported > 0 && (
        <Link
          href="/admin/cases?review=DRAFT"
          className="block rounded-xl border-2 border-[#b0832f]/50 bg-[#b0832f]/10 p-4 hover:border-[#b0832f]"
        >
          <p className="font-semibold">새로 들어온 사건 {data.cases.autoImported.toLocaleString("ko-KR")}건을 확인해 주세요</p>
          <p className="mt-1 text-sm text-muted">
            매일 새벽 자동으로 찾아 넣은 비공개 초안입니다. 내용과 출처를 확인하고, 고칠 곳은 고친 뒤 검증 완료·공개를 눌러 주세요.
          </p>
        </Link>
      )}
      <Card>
        <h2 className="mb-3 text-sm font-semibold">할 일</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat href="/admin/cases?review=NEEDS_REVIEW" label="검토 필요한 사건" value={data.cases.needsReview} alert />
          <Stat href="/admin/moderation?filter=held" label="보류된 글" value={data.moderation.held} hint="AI 검사가 애매하거나 꺼져 있던 글" alert />
          <Stat href="/admin/moderation?filter=reported" label="신고된 글" value={data.moderation.reported} alert />
          <Stat href="/admin/inquiries?status=OPEN" label="답변 안 한 문의" value={data.inquiries.open} alert />
          <Stat href="/admin/news" label="확인 안 한 새 뉴스" value={data.briefing.newNews} hint="공개한 기사만 브리핑룸에 보입니다" />
        </div>
      </Card>
      <Card>
        <h2 className="mb-1 text-sm font-semibold">자동 작업</h2>
        <p className="mb-3 text-xs text-subtle">사람이 손대지 않아도 정해진 때에 돌아가는 일입니다. 시각은 한국 시간입니다.</p>
        <ul className="divide-y divide-line text-sm">
          {data.jobs.map((j) => (
            <li key={j.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="w-40 shrink-0">
                <p className="font-medium">{j.name}</p>
                <p className="text-xs text-jade-ink">{j.enabled ? j.schedule : "꺼져 있음"}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-muted">{j.description}</p>
                <p className="mt-1 text-xs text-subtle">마지막으로 한 때: {j.lastAt ? kstTime(j.lastAt) : j.key === "clouds" ? "보류된 글이 있을 때만 기록됩니다" : "아직 기록이 없습니다"}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">사건 파일</h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat href="/admin/cases?published=true" label="공개 중" value={data.cases.published} />
            <Stat href="/admin/cases?review=DRAFT" label="초안" value={data.cases.drafts} />
            <Stat href="/admin/cases?review=VERIFIED&published=false" label="검증 완료, 아직 비공개" value={data.cases.unpublishedVerified} />
            <Stat href="/admin/briefing?status=DRAFT" label="브리핑 초안" value={data.briefing.drafts} />
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold">최근 7일</h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat href="/admin/analytics" label="오늘 방문자" value={analytics.today.visitors} hint={`페이지 조회 ${analytics.today.views}`} />
            <Stat href="/admin/analytics?days=7" label="7일 조회수" value={analytics.totals.views} />
            <Stat href="/admin/feedback?status=OPEN" label="새 의견" value={data.inquiries.newFeedback} />
            <Stat href="/admin/moderation?filter=voters" label="참여 제한한 사람" value={data.moderation.blockedVoters} />
          </div>
        </Card>
      </div>
    </div>
  );
}
