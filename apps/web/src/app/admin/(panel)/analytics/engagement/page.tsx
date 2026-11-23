import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { Card, ErrorBox, FilterTabs, PageTitle, Skeleton } from "@/components/admin/ui";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { Analytics } from "@/lib/admin/types";

export const metadata: Metadata = { title: "참여 분석" };

export default function EngagementAnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <PageTitle
        title="참여 분석"
        description="사람들이 어떤 질문과 사건에 반응하는지 살펴보고, 홈과 브리핑에 이어 갈 주제를 찾습니다."
      />
      <AnalyticsTabs current="engagement" />
      <Suspense fallback={<Skeleton />}>
        {searchParams.then((sp) => {
          const days = ["7", "90"].includes(String(sp.days)) ? Number(sp.days) : 30;
          return (
            <>
              <FilterTabs
                current={String(days)}
                items={[7, 30, 90].map((d) => ({ key: String(d), label: `${d}일`, href: `/admin/analytics/engagement?days=${d}` }))}
              />
              <Suspense key={days} fallback={<Skeleton />}>
                <EngagementReport days={days} />
              </Suspense>
            </>
          );
        })}
      </Suspense>
    </>
  );
}

function Metric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString("ko-KR")}</p>
      <p className="mt-1 text-xs text-subtle">{hint}</p>
    </div>
  );
}

async function EngagementReport({ days }: { days: number }) {
  let analytics: Analytics;
  try {
    analytics = await adminGet<Analytics>(`/analytics?days=${days}`);
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }

  const p = analytics.participation;
  const questions = analytics.topAnsweredQuestions;
  const maxAnswers = Math.max(1, ...questions.map((item) => item.answers));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="수사 노트 답변" value={p.answers} hint="사건 질문에 남긴 생각" />
        <Metric label="형량 의견" value={p.votes} hint="확정 형량에 대한 투표" />
        <Metric label="사용자 질문" value={p.questions} hint="사건에서 더 궁금한 점" />
        <Metric label="실종자들의 정원 응원" value={p.clouds} hint="실종자에게 보낸 마음" />
      </div>

      <Card>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">답변이 모인 질문</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-subtle">
              공개된 수사 노트 답변을 질문별로 정렬했습니다. 지금은 분석만 하며, 상위 질문은 나중에 홈이나 브리핑 주제를 정할 때 참고할 수 있습니다.
            </p>
          </div>
          {questions.length > 0 && (
            <span className="rounded-full bg-[#c46a4b]/10 px-3 py-1 text-xs font-medium text-[#c46a4b]">
              나중에 홈 검토 {Math.min(3, questions.length)}개
            </span>
          )}
        </div>

        {questions.length ? (
          <ol className="divide-y divide-line rounded-lg border border-line bg-background/40">
            {questions.map((item, index) => (
              <li key={item.questionId} className="grid gap-3 p-4 sm:grid-cols-[2rem_minmax(0,1fr)_7rem] sm:items-center">
                <span className="flex size-7 items-center justify-center rounded-full bg-line/60 text-xs font-semibold tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="truncate">{item.caseTitle}</span>
                    {index < 3 && <span className="rounded-full bg-[#2f7469]/10 px-2 py-0.5 text-[#2f7469]">검토 후보</span>}
                  </p>
                  <Link href={`/cases/${item.caseSlug}`} className="mt-1 block text-sm font-medium leading-6 hover:underline">
                    {item.question}
                  </Link>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/60" aria-hidden>
                    <div className="h-full rounded-full bg-[#c46a4b]" style={{ width: `${(item.answers / maxAnswers) * 100}%` }} />
                  </div>
                </div>
                <p className="text-sm tabular-nums text-muted sm:text-right">
                  <strong className="text-lg text-foreground">{item.answers}</strong>건
                  {item.empathy > 0 && <span className="mt-1 block text-xs">공감 {item.empathy}개</span>}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-subtle">
            선택한 기간에 공개된 수사 노트 답변이 아직 없습니다.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">홈에 활용하는 기준</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-3">
          <p className="rounded-lg bg-background/60 p-3"><strong className="block">답변 수</strong><span className="text-muted">실제로 이야기가 많이 모인 질문인지 확인</span></p>
          <p className="rounded-lg bg-background/60 p-3"><strong className="block">공감 수</strong><span className="text-muted">방문자가 특히 공감한 관점이 있는지 확인</span></p>
          <p className="rounded-lg bg-background/60 p-3"><strong className="block">사건 조회수</strong><span className="text-muted">질문뿐 아니라 사건 자체의 관심도와 함께 판단</span></p>
        </div>
        <p className="mt-4 rounded-md bg-background/60 px-3 py-2 text-xs text-subtle">
          현재 홈 화면에는 아무것도 노출하지 않으며, 이 분석 결과가 홈을 자동으로 바꾸지도 않습니다.
        </p>
      </Card>
    </div>
  );
}
