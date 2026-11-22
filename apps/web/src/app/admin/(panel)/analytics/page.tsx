import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { setDeviceExcluded } from "@/app/admin/actions";
import { AnalyticsTabs } from "@/components/admin/AnalyticsTabs";
import { Card, ErrorBox, FilterTabs, PageTitle, Skeleton } from "@/components/admin/ui";
import { AdminApiError, NO_ANALYTICS_COOKIE, adminGet } from "@/lib/admin/session";
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
      <Suspense fallback={null}>
        <ThisDevice />
      </Suspense>
      <AnalyticsTabs current="traffic" />
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

/** 관리자 본인 기기: 이 기기에서 둘러본 것은 세지 않음 (관리실에 로그인하면 자동으로 켜짐) */
async function ThisDevice() {
  const excluded = (await cookies()).get(NO_ANALYTICS_COOKIE)?.value === "1";
  return (
    <form
      action={setDeviceExcluded.bind(null, !excluded)}
      className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm"
    >
      <p className={excluded ? "text-[#2f7469]" : "text-muted"}>
        {excluded
          ? "이 기기에서 둘러본 것은 방문자 분석에 넣지 않습니다. 폰 등 다른 기기는 그 기기에서 관리실에 한 번 로그인하면 똑같이 빠집니다."
          : "이 기기에서 둘러본 것도 지금은 방문자로 셉니다."}
      </p>
      <button type="submit" className="shrink-0 rounded-full border border-line px-3 py-1 text-xs hover:bg-black/5">
        {excluded ? "이 기기도 세기" : "이 기기 빼기"}
      </button>
    </form>
  );
}

function Number_({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {typeof value === "number" ? value.toLocaleString("ko-KR") : value}
      </p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

/** 막대 길이 = 값/최댓값. 숫자를 함께 적어 색에만 의존하지 않음 */
function Bars({ rows, unit = "번" }: { rows: { label: string; value: number; sub?: string; title?: string }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.title ?? r.label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="truncate" title={r.title}>{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {r.value.toLocaleString("ko-KR")}
              {unit}
              {r.sub && <span className="ml-1 text-xs text-subtle">· {r.sub}</span>}
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

function shortDay(day: string) {
  const [, month = "", date = ""] = day.split("-");
  return `${Number(month)}.${Number(date)}`;
}

function dayRange(first: string, last: string) {
  if (first === last) return shortDay(first);
  const [, firstMonth = "", firstDate = ""] = first.split("-");
  const [, lastMonth = "", lastDate = ""] = last.split("-");
  return firstMonth === lastMonth
    ? `${Number(firstMonth)}.${Number(firstDate)}–${Number(lastDate)}`
    : `${shortDay(first)}–${shortDay(last)}`;
}

/** 긴 조회 기간도 막대가 너무 가늘어지지 않도록 30일은 3일, 90일은 7일 단위로 묶음 */
function groupDaily(daily: Analytics["daily"]) {
  const chunkSize = daily.length <= 14 ? 1 : daily.length <= 31 ? 3 : 7;
  const groups: { key: string; label: string; views: number; visitors: number; title: string }[] = [];

  for (let i = 0; i < daily.length; i += chunkSize) {
    const rows = daily.slice(i, i + chunkSize);
    const first = rows[0];
    const last = rows.at(-1);
    if (!first || !last) continue;
    const label = dayRange(first.day, last.day);
    const views = rows.reduce((sum, row) => sum + row.views, 0);
    const visitors = rows.reduce((sum, row) => sum + row.visitors, 0);
    groups.push({
      key: `${first.day}-${last.day}`,
      label,
      views,
      visitors,
      title: `${label} · 방문자 ${visitors}명 · 조회 ${views}번`,
    });
  }

  return groups;
}

function DailyChart({ daily }: { daily: Analytics["daily"] }) {
  const groups = groupDaily(daily);
  const max = Math.max(1, ...groups.map((d) => d.views));
  const activeDays = daily.filter((d) => d.views > 0).length;
  const peak = daily.reduce<(typeof daily)[number] | null>((best, row) => (!best || row.views > best.views ? row : best), null);
  const middleLabelIndex = Math.floor((groups.length - 1) / 2);

  return (
    <div aria-label="기간별 방문자와 조회수 막대 그래프">
      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 rounded-lg bg-background/60 px-4 py-3 text-sm">
        <p>
          <span className="text-subtle">방문이 있었던 날</span>{" "}
          <strong className="ml-1 tabular-nums">{activeDays}일</strong>
        </p>
        <p>
          <span className="text-subtle">조회가 가장 많았던 날</span>{" "}
          <strong className="ml-1 tabular-nums">
            {peak && peak.views > 0 ? `${shortDay(peak.day)} · ${peak.views.toLocaleString("ko-KR")}번` : "아직 없음"}
          </strong>
        </p>
      </div>

      <div className="flex gap-2" role="img" aria-label="기간별 방문자와 조회수 막대 그래프">
        <div className="relative h-48 w-8 shrink-0 text-[11px] tabular-nums text-subtle" aria-hidden>
          <span className="absolute top-0 right-0 -translate-y-1/2">{max.toLocaleString("ko-KR")}</span>
          <span className="absolute top-1/2 right-0 -translate-y-1/2">{Math.round(max / 2).toLocaleString("ko-KR")}</span>
          <span className="absolute right-0 bottom-0 translate-y-1/2">0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-48">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
              <span className="border-t border-line/80" />
              <span className="border-t border-dashed border-line/70" />
              <span className="border-t border-line/80" />
            </div>
            <div className="relative flex h-full items-end gap-1 sm:gap-2">
              {groups.map((d) => (
                <div key={d.key} className="group flex h-full min-w-0 flex-1 items-end justify-center gap-px" title={d.title}>
                  <div
                    className="w-[42%] max-w-6 rounded-t-[3px] bg-[#2f7469] transition-opacity group-hover:opacity-75"
                    style={{ height: `${(d.visitors / max) * 100}%`, minHeight: d.visitors ? 3 : 0 }}
                  />
                  <div
                    className="w-[42%] max-w-6 rounded-t-[3px] bg-[#c46a4b] transition-opacity group-hover:opacity-75"
                    style={{ height: `${(d.views / max) * 100}%`, minHeight: d.views ? 3 : 0 }}
                  />
                </div>
              ))}
            </div>
          </div>
          {groups.length <= 7 ? (
            <div className="mt-2 grid text-[11px] tabular-nums text-subtle" style={{ gridTemplateColumns: `repeat(${Math.max(1, groups.length)}, minmax(0, 1fr))` }}>
              {groups.map((d) => <span key={d.key} className="text-center">{d.label}</span>)}
            </div>
          ) : (
            <div className="mt-2 flex justify-between text-[11px] tabular-nums text-subtle">
              <span>{groups[0]?.label}</span>
              <span>{groups[middleLabelIndex]?.label}</span>
              <span>{groups.at(-1)?.label}</span>
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 flex flex-wrap gap-4 pl-10 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-[#2f7469]" /> 방문자</span>
        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-[#c46a4b]" /> 페이지 조회</span>
        {daily.length > 14 && <span className="text-subtle">막대 하나는 {daily.length <= 31 ? "3일" : "7일"} 합계</span>}
      </p>
      <dl className="sr-only">
        {groups.map((d) => <div key={d.key}><dt>{d.label}</dt><dd>방문자 {d.visitors}명, 조회 {d.views}번</dd></div>)}
      </dl>
    </div>
  );
}

/** 24개의 가는 막대 대신 3시간 단위로 묶어 값과 차이를 함께 읽을 수 있게 표시 */
function HourlyChart({ hourly }: { hourly: Analytics["hourly"] }) {
  const groups = Array.from({ length: 8 }, (_, index) => {
    const start = index * 3;
    return {
      label: `${start}–${start + 2}시`,
      views: hourly.filter((h) => h.hour >= start && h.hour < start + 3).reduce((sum, h) => sum + h.views, 0),
    };
  });
  const max = Math.max(1, ...groups.map((h) => h.views));
  const peak = groups.reduce((best, group) => (group.views > best.views ? group : best), groups[0]);

  return (
    <div>
      <p className="mb-4 rounded-lg bg-background/60 px-4 py-3 text-sm">
        <span className="text-subtle">가장 많이 보는 시간</span>{" "}
        <strong className="ml-1 tabular-nums">{peak.views > 0 ? `${peak.label} · ${peak.views.toLocaleString("ko-KR")}번` : "아직 없음"}</strong>
      </p>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2" role="img" aria-label="3시간대별 조회수 막대 그래프">
        {groups.map((h) => (
          <div key={h.label} className="grid grid-cols-[3.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 text-sm" title={`${h.label} · 조회 ${h.views}번`}>
            <span className="text-xs tabular-nums text-muted">{h.label}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-line/60">
              <div
                className={`h-full rounded-full ${h === peak && h.views > 0 ? "bg-[#c46a4b]" : "bg-[#2f7469]"}`}
                style={{ width: `${(h.views / max) * 100}%`, minWidth: h.views ? 3 : 0 }}
              />
            </div>
            <strong className="text-right text-xs tabular-nums">{h.views.toLocaleString("ko-KR")}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

const SOURCE_LABEL: Record<keyof Analytics["sources"], string> = {
  search: "검색 (구글·네이버 등)",
  sns: "SNS (인스타그램 등)",
  direct: "직접 들어옴 (주소 입력·즐겨찾기·메신저 링크)",
  other: "다른 사이트의 링크",
};

/** 검색 등록 관리 사이트 (사이트 주소가 등록된 계정으로 로그인해야 열림) */
const SEARCH_CONSOLES = [
  {
    name: "구글 서치 콘솔",
    href: "https://search.google.com/search-console?resource_id=https%3A%2F%2Fwishwind.vercel.app%2F",
    hint: "색인 현황, 검색어, 'URL 검사'로 색인 생성 요청",
  },
  {
    name: "네이버 서치어드바이저",
    href: "https://searchadvisor.naver.com/console/board",
    hint: "사이트맵 제출, '웹 페이지 수집' 요청, 검색 노출 현황",
  },
];

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
  const sourceTotal = Object.values(a.sources).reduce((n, v) => n + v, 0);
  const recentViews = a.daily.slice(-7).reduce((sum, row) => sum + row.views, 0);
  const previousViews = a.daily.slice(-14, -7).reduce((sum, row) => sum + row.views, 0);
  const trend = previousViews > 0 ? Math.round(((recentViews - previousViews) / previousViews) * 100) : null;
  const discoveryVisitors = a.sources.search + a.sources.sns + a.sources.other;
  const directShare = sourceTotal > 0 ? Math.round((a.sources.direct / sourceTotal) * 100) : 0;
  const participationTotal = p.answers + p.questions + p.votes + p.clouds + p.inquiries + p.feedback;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Number_ label="오늘 방문자 (명)" value={a.today.visitors} hint={`오늘 페이지를 연 횟수 ${a.today.views}번`} />
        <Number_ label={`${days}일 페이지 조회 (번)`} value={a.totals.views} hint="페이지를 연 횟수 합계" />
        <Number_ label={`${days}일 방문자 (명)`} value={a.totals.visitorDays} hint="같은 사람도 다른 날 오면 따로 셉니다" />
        <Number_
          label="하루 평균 방문자 (명)"
          value={(a.totals.visitorDays / Math.max(1, days)).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}
          hint="선택한 기간의 일평균"
        />
      </div>
      <Card>
        <div className="mb-4">
          <h2 className="text-sm font-semibold">분석 요약</h2>
          <p className="mt-1 text-xs text-subtle">단순 합계보다 지금 바뀌고 있는 부분을 먼저 보여 줍니다.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line/80 bg-background/50 p-4">
            <p className="text-xs text-subtle">최근 7일 조회 흐름</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {days >= 14
                ? trend === null
                  ? recentViews > 0 ? "새 방문 발생" : "변화 없음"
                  : `${trend > 0 ? "+" : ""}${trend}%`
                : `${recentViews.toLocaleString("ko-KR")}번`}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {days >= 14
                ? `이전 7일 ${previousViews.toLocaleString("ko-KR")}번 → 최근 ${recentViews.toLocaleString("ko-KR")}번`
                : "조회 기간 전체의 페이지 조회"}
            </p>
          </div>
          <div className="rounded-lg border border-line/80 bg-background/50 p-4">
            <p className="text-xs text-subtle">새로운 사람을 만난 경로</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{discoveryVisitors.toLocaleString("ko-KR")}명</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              검색·SNS·외부 사이트 유입 합계 · 직접 유입 {directShare}%
            </p>
          </div>
          <Link href={`/admin/analytics/engagement?days=${days}`} className="rounded-lg border border-line/80 bg-background/50 p-4 transition-colors hover:border-foreground/30">
            <p className="text-xs text-subtle">사이트 안에서 한 참여</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{participationTotal.toLocaleString("ko-KR")}건</p>
            <p className="mt-1 text-xs leading-5 text-muted">형량 의견·수사 노트·실종방 응원·문의·의견 합계</p>
          </Link>
        </div>
      </Card>
      <Card>
        <h2 className="mb-4 text-sm font-semibold">일별 방문</h2>
        <DailyChart daily={a.daily} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-sm font-semibold">유입 분석</h2>
          <p className="mb-5 text-xs leading-5 text-subtle">
            유입 유형은 방문자가 처음 들어온 방식이고, 참조 도메인은 모든 페이지 조회에서 확인된 이전 사이트입니다. 기준이 달라 숫자는 서로 같지 않을 수 있습니다.
          </p>
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <div>
              <h3 className="mb-1 text-xs font-semibold text-muted">처음 들어온 방식 · 방문자 기준</h3>
              <p className="mb-4 text-xs text-subtle">검색과 SNS가 늘수록 처음 보는 사람이 발견할 가능성이 커집니다.</p>
              {sourceTotal ? (
                <Bars
                  unit="명"
                  rows={(Object.keys(SOURCE_LABEL) as (keyof Analytics["sources"])[]).map((k) => ({
                    label: SOURCE_LABEL[k],
                    value: a.sources[k],
                    sub: `${Math.round((a.sources[k] / sourceTotal) * 100)}%`,
                  }))}
                />
              ) : (
                <p className="text-sm text-subtle">아직 기록이 없습니다.</p>
              )}
              <p className="mt-4 rounded-md bg-background/60 px-3 py-2 text-xs text-muted">
                한 페이지만 보고 나간 방문자 {a.singlePageVisitors.toLocaleString("ko-KR")}명
                {sourceTotal > 0 && ` · ${Math.round((a.singlePageVisitors / sourceTotal) * 100)}%`}
              </p>
            </div>
            <div className="border-t border-line pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <h3 className="mb-1 text-xs font-semibold text-muted">참조 도메인 · 페이지 조회 기준</h3>
              <p className="mb-4 text-xs text-subtle">링크를 누르기 직전에 머물던 외부 사이트입니다. 로그인 경유 주소도 포함될 수 있습니다.</p>
              {a.referrers.length ? (
                <Bars rows={a.referrers.map((r) => ({ label: r.host, value: r.views }))} />
              ) : (
                <p className="text-sm text-subtle">외부 사이트에서 들어온 기록이 아직 없습니다.</p>
              )}
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-semibold">처음 연 페이지</h2>
          <p className="mb-4 text-xs text-subtle">사람들이 가장 먼저 만나는 곳입니다. 여기서 다른 방으로 이어지게 하면 더 오래 머뭅니다.</p>
          {a.landing.length ? (
            <Bars unit="명" rows={a.landing.map((r) => ({ label: r.label, value: r.visitors, title: safeDecode(r.path) }))} />
          ) : (
            <p className="text-sm text-subtle">아직 기록이 없습니다.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-semibold">시간대별 방문</h2>
          <p className="mb-4 text-xs text-subtle">한국 시간 기준 페이지 조회입니다. 인스타그램 게시는 많이 오는 시간 조금 전에 올려 보세요.</p>
          <HourlyChart hourly={a.hourly} />
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-semibold">검색 등록 관리</h2>
          <p className="mb-3 text-xs text-subtle">검색에 잘 나오려면 이곳에서 색인·수집을 요청하고 결과를 확인합니다.</p>
          <ul className="space-y-3 text-sm">
            {SEARCH_CONSOLES.map((c) => (
              <li key={c.name}>
                <a href={c.href} target="_blank" rel="noreferrer noopener" className="font-medium text-[#2f7469] transition-opacity hover:opacity-70">
                  {c.name}
                </a>
                <p className="text-xs text-subtle">{c.hint}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold">방별 조회수</h2>
          {a.rooms.length ? (
            <>
              <Bars rows={a.rooms.map((r) => ({ label: ROOM_LABEL[r.room] ?? r.room, value: r.views }))} />
              <p className="mt-3 text-xs text-subtle">숫자는 그 방의 페이지를 연 횟수입니다.</p>
            </>
          ) : (
            <p className="text-sm text-subtle">아직 기록이 없습니다.</p>
          )}
        </Card>
        {a.tips.length > 0 && (
          <Card className="lg:col-span-2">
            <h2 className="mb-1 text-sm font-semibold">다음 행동</h2>
            <p className="mb-3 text-xs text-subtle">현재 숫자에서 바로 실행할 수 있는 일을 우선순위로 정리했습니다.</p>
            <ol className="grid gap-3 sm:grid-cols-2">
              {a.tips.map((tip, index) => (
                <li key={tip} className="flex gap-3 rounded-lg border border-line/80 bg-background/50 p-3 text-sm leading-6">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-surface">
                    {index + 1}
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ol>
          </Card>
        )}
        <Card>
          <h2 className="mb-1 text-sm font-semibold">많이 본 페이지</h2>
          <p className="mb-4 text-xs text-subtle">연 횟수 · 연 사람 수</p>
          {a.topPaths.length ? (
            <Bars rows={a.topPaths.map((r) => ({ label: r.label, value: r.views, sub: `${r.visitors}명`, title: safeDecode(r.path) }))} />
          ) : (
            <p className="text-sm text-subtle">아직 기록이 없습니다.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-1 text-sm font-semibold">많이 본 사건</h2>
          <p className="mb-4 text-xs text-subtle">연 횟수 · 연 사람 수</p>
          {a.topCases.length ? (
            <Bars
              rows={a.topCases.map((r) => ({
                label: r.label.replace(/^사건방 · /, ""),
                value: r.views,
                sub: `${r.visitors}명`,
                title: safeDecode(r.path),
              }))}
            />
          ) : (
            <p className="text-sm text-subtle">아직 기록이 없습니다.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
