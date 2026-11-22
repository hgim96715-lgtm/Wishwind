import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { setDeviceExcluded } from "@/app/admin/actions";
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

/** 한국 시간 시각별 조회수 막대 (방문이 많은 시간에 게시물을 올리면 더 많이 보임) */
function HourlyChart({ hourly }: { hourly: Analytics["hourly"] }) {
  const max = Math.max(1, ...hourly.map((h) => h.views));
  return (
    <div>
      <div className="flex h-28 items-end gap-0.5" role="img" aria-label="시간대별 조회수 막대 그래프">
        {hourly.map((h) => (
          <div key={h.hour} className="flex h-full flex-1 flex-col justify-end" title={`${h.hour}시 · 조회 ${h.views}번`}>
            <div className="rounded-t-sm bg-[#2f7469]" style={{ height: `${(h.views / max) * 100}%`, minHeight: h.views ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-subtle">
        <span>0시</span>
        <span>6시</span>
        <span>12시</span>
        <span>18시</span>
        <span>23시</span>
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
  return (
    <div className="space-y-6">
      {a.tips.length > 0 && (
        <Card>
          <h2 className="mb-1 text-sm font-semibold">해 볼 일</h2>
          <p className="mb-3 text-xs text-subtle">아래 숫자를 보고 방문자를 늘리는 데 도움이 될 만한 일을 골랐습니다.</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
            {a.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Number_ label="오늘 방문자 (명)" value={a.today.visitors} hint={`오늘 페이지를 연 횟수 ${a.today.views}번`} />
        <Number_ label={`${days}일 페이지 조회 (번)`} value={a.totals.views} hint="페이지를 연 횟수 합계" />
        <Number_ label={`${days}일 방문자 (명)`} value={a.totals.visitorDays} hint="같은 사람도 다른 날 오면 따로 셉니다" />
        <Number_
          label="하루 평균 방문자 (명)"
          value={Math.round(a.totals.visitorDays / Math.max(1, days))}
        />
      </div>
      <Card>
        <h2 className="mb-4 text-sm font-semibold">일별 방문</h2>
        <DailyChart daily={a.daily} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-sm font-semibold">어떻게 들어왔나요</h2>
          <p className="mb-4 text-xs text-subtle">방문자가 처음 들어온 길입니다. 검색이 늘어야 모르는 사람도 찾아옵니다.</p>
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
          <p className="mt-3 text-xs text-subtle">
            한 페이지만 보고 나간 방문자 {a.singlePageVisitors.toLocaleString("ko-KR")}명
            {sourceTotal > 0 && ` (${Math.round((a.singlePageVisitors / sourceTotal) * 100)}%)`}
          </p>
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
        <Card>
          <h2 className="mb-4 text-sm font-semibold">참여 ({days}일)</h2>
          <Bars
            unit="건"
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
