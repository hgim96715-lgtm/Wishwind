import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, ErrorBox, FilterTabs, PageTitle, Skeleton } from "@/components/admin/ui";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { Analytics } from "@/lib/admin/types";

export const metadata: Metadata = { title: "방문자 분석" };

const ROOM_LABEL: Record<string, string> = {
  home: "홈",
  cases: "사건방",
  missing: "실종방",
  briefing: "브리핑룸",
  contact: "문의하기",
};

export default function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <PageTitle
        title="방문자 분석"
        description="쿠키 없이 하루 단위로만 방문자를 셉니다. IP와 브라우저 정보는 저장하지 않고, 날마다 바뀌는 해시만 남깁니다."
      />
      <Suspense fallback={<Skeleton />}>
        {searchParams.then((sp) => {
          const days = ["7", "90"].includes(String(sp.days)) ? Number(sp.days) : 30;
          return (
            <>
              <FilterTabs
                current={String(days)}
                items={[7, 30, 90].map((d) => ({ key: String(d), label: `${d}일`, href: `/admin/analytics?days=${d}` }))}
              />
              <Suspense key={days} fallback={<Skeleton />}>
                <Report days={days} />
              </Suspense>
            </>
          );
        })}
      </Suspense>
    </>
  );
}

function Number_({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString("ko-KR")}</p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

/** 막대 길이 = 값/최댓값. 숫자를 함께 적어 색에만 의존하지 않음 */
function Bars({ rows }: { rows: { label: string; value: number; sub?: string; title?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.title ?? r.label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="truncate" title={r.title}>{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {r.value.toLocaleString("ko-KR")}
              {r.sub && <span className="ml-1 text-xs text-subtle">{r.sub}</span>}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-line/60">
            <div className="h-1.5 rounded-full bg-[#4f78a8]" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DailyChart({ daily }: { daily: Analytics["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.views));
  return (
    <div>
      <div className="flex h-40 items-end gap-px" role="img" aria-label="일별 방문자와 조회수 막대 그래프">
        {daily.map((d) => (
          <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day} · 방문자 ${d.visitors} · 조회 ${d.views}`}>
            <div className="flex flex-col justify-end rounded-t-sm bg-[#4f78a8]/25" style={{ height: `${(d.views / max) * 100}%` }}>
              <div className="rounded-t-sm bg-[#4f78a8]" style={{ height: `${d.views ? (d.visitors / d.views) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-subtle">
        <span>{daily[0]?.day}</span>
        <span>{daily.at(-1)?.day}</span>
      </div>
      <p className="mt-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-[#4f78a8]" /> 방문자</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-[#4f78a8]/25" /> 조회수</span>
      </p>
    </div>
  );
}

function safeDecode(path: string) {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

async function Report({ days }: { days: number }) {
  let a: Analytics;
  try {
    a = await adminGet<Analytics>(`/analytics?days=${days}`);
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  const p = a.participation;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Number_ label="오늘 방문자" value={a.today.visitors} hint={`조회 ${a.today.views}`} />
        <Number_ label={`${days}일 조회수`} value={a.totals.views} />
        <Number_ label={`${days}일 방문자 (일별 합계)`} value={a.totals.visitorDays} hint="같은 사람이 이틀 오면 2로 셉니다" />
        <Number_
          label="하루 평균 방문자"
          value={Math.round(a.totals.visitorDays / Math.max(1, days))}
        />
      </div>
      <Card>
        <h2 className="mb-4 text-sm font-semibold">일별 방문</h2>
        <DailyChart daily={a.daily} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold">방별 조회수</h2>
          {a.rooms.length ? (
            <Bars rows={a.rooms.map((r) => ({ label: ROOM_LABEL[r.room] ?? r.room, value: r.views }))} />
          ) : (
            <p className="text-sm text-subtle">아직 기록이 없습니다.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold">참여 ({days}일)</h2>
          <Bars
            rows={[
              { label: "형량 의견", value: p.votes },
              { label: "수사 노트 답변", value: p.answers },
              { label: "사용자 질문", value: p.questions },
              { label: "실종방 응원", value: p.clouds },
              { label: "문의", value: p.inquiries },
              { label: "의견", value: p.feedback },
            ]}
          />
          <p className="mt-3 text-xs text-subtle">차단·숨김된 답변 {p.blockedAnswers}개</p>
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold">많이 본 페이지</h2>
          {a.topPaths.length ? (
            <Bars rows={a.topPaths.map((r) => ({ label: r.label, value: r.views, sub: `방문자 ${r.visitors}`, title: safeDecode(r.path) }))} />
          ) : (
            <p className="text-sm text-subtle">아직 기록이 없습니다.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold">많이 본 사건</h2>
          {a.topCases.length ? (
            <Bars
              rows={a.topCases.map((r) => ({
                label: r.label.replace(/^사건방 · /, ""),
                value: r.views,
                sub: `방문자 ${r.visitors}`,
                title: safeDecode(r.path),
              }))}
            />
          ) : (
            <p className="text-sm text-subtle">아직 기록이 없습니다.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold">어디서 왔나요</h2>
          {a.referrers.length ? (
            <Bars rows={a.referrers.map((r) => ({ label: r.host, value: r.views }))} />
          ) : (
            <p className="text-sm text-subtle">다른 사이트에서 들어온 기록이 아직 없습니다.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
