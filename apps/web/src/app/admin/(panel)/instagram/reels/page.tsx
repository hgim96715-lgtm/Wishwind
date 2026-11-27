import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, Empty, ErrorBox, PageTitle, Skeleton } from "@/components/admin/ui";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { InstagramPostRow, InstagramPosts } from "@/lib/admin/types";

export const metadata: Metadata = { title: "릴스 분석" };

const COLORS = ["#3f8f84", "#b5543a", "#4f78a8", "#a07a2c", "#7a5ea8", "#5b8a3c"];
const fmt = (n: number, d = 0) => n.toLocaleString("ko-KR", { maximumFractionDigits: d });

export default function ReelsPage() {
  return (
    <>
      <PageTitle
        title="릴스 분석"
        description="인사이트 화면의 숫자를 릴스별로 모아 비교합니다. 숫자는 인스타 성과 페이지의 '릴스 인사이트 상세'에 입력합니다."
      />
      <Suspense fallback={<Skeleton />}>
        <Charts />
      </Suspense>
      <p className="mt-6 text-sm">
        <Link href="/admin/instagram" className="text-jade-ink underline">
          인스타 성과로 돌아가기
        </Link>
      </p>
    </>
  );
}

/** 유지 곡선에서 t초 시점의 남은 시청 %를 선형 보간 */
function retentionAt(points: { t: number; p: number }[], t: number) {
  const sorted = [...points].sort((a, b) => a.t - b.t);
  if (sorted.length === 0) return null;
  if (t <= sorted[0].t) return sorted[0].p;
  for (let i = 1; i < sorted.length; i++) {
    if (t <= sorted[i].t) {
      const [a, b] = [sorted[i - 1], sorted[i]];
      return a.p + ((b.p - a.p) * (t - a.t)) / (b.t - a.t || 1);
    }
  }
  return sorted[sorted.length - 1].p;
}

/** 올린 영상 파일에서 직접 측정한 구성 (길이·소리·첫 화면 변화 시점). 새 릴스를 올리면 여기에 한 줄 추가 */
const VIDEO_FACTS = [
  { date: "11/24", title: "D.B. 쿠퍼", length: "17.6초", sound: "소리 없음", firstChange: "2초", note: "첫 프레임에 제목이 흐리게 페이드인(0초에는 글씨가 거의 안 보임). 이후 장면 전환은 약 2초 간격의 미세한 움직임. 두 번째 문구(미제 항공 납치 사건)는 약 4초" },
  { date: "11/25", title: "미라발 자매 (기념일)", length: "32.3초", sound: "있음", firstChange: "4.2초", note: "4초까지 화면 변화 없음. 첫 문구가 '이유'를 설명하는 주제형이라 긴장감이 약함. 인물 얼굴 없이 실루엣 사진" },
  { date: "11/26", title: "이윤희 실종", length: "26.7초", sound: "있음", firstChange: "5.4초", note: "0.3초에 사진 등장 후 5초 넘게 정지. 5장 슬라이드(01/05) 구조, 상단 진행바와 작은 장식 글씨" },
  { date: "11/27", title: "재클린 던리비", length: "40.0초", sound: "처음부터 있음", firstChange: "1.8초", note: "0초부터 제목 글씨가 선명하게 보임(페이드인 없음). 사진만 어두운 상태에서 1.8초까지 밝아짐. 첫 문구가 반전 결과(58년 만에 찾아냄), 1.8초에 두 번째 문구(28년간 소방대원)로 바뀜. 이후 5.8초에 02/06, 약 10·14·20·24·28·35초에 장면이 바뀜. 길이는 20초 안팎으로 줄이지 않고 40초 그대로" },
] as const;

const EXPERIMENTS = [
  { when: "11/27 던리비 결과", change: "반전 문구를 첫 장면에 두고 0초부터 글씨를 보이게 했지만 건너뛰기 82.4%, 3초 유지율 약 17%로 기준(70% 미만·45% 이상)에 못 미침. 글씨 도입만 바꿔서는 효과가 없었고, 화면이 여전히 정지 사진 슬라이드라는 점이 남은 원인으로 보임. 반응은 0, 조회는 첫 1시간 약 110에서 정체", pass: "이미 판정 완료: 도입 문구 변경 단독으로는 불충분" },
  { when: "다음 3개 (화면 변화)", change: "문구는 그대로 두고 화면만 바꿈: 처음 1초 안에 사진을 확대·이동시키거나 컷을 전환하고, 3초 안에 컷 3회 이상. 소리는 0.5초 안에 시작. 길이는 15~20초로 줄임 (던리비 40초는 끝까지 보는 사람이 5%였음)", pass: "건너뛰기 70% 미만, 3초 유지율 30% 이상 (이전 평균 약 20%)"},
  { when: "그다음 3개 (첫 문구)", change: "화면 구성은 위와 같게 두고 첫 문구만 비교: 결과를 먼저 말하는 형(58년 만에 찾아냈습니다) vs 질문형(왜 16세 소녀는 58년간 못 찾았을까) vs 숫자형. 시청자 88.9%가 한국이라 한국 사건이나 한국어 제목 첫 줄도 한 번 시험", pass: "3초 유지율이 가장 높은 쪽을 채택"},
  { when: "그다음 3개 (반응 유도)", change: "마지막 장면에 한 줄만 넣음: '저장해 두고 다시 보세요' 또는 '이 사건 기록은 프로필 링크'. 좋아요·저장·공유가 모두 0이라, 끝까지 본 5%가 할 행동을 알려주는 시험", pass: "저장·공유·프로필 방문이 처음으로 1 이상 생기는 형식을 기록"},
] as const;

const label = (p: InstagramPostRow) => `${p.postedOn.slice(5)} ${p.title.length > 16 ? `${p.title.slice(0, 16)}…` : p.title}`;

async function Charts() {
  await connection();
  let data: InstagramPosts;
  try {
    data = await adminGet<InstagramPosts>("/instagram/posts");
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  const reels = data.items.filter((p) => p.kind === "REEL" && (p.views ?? p.reach) > 0).sort((a, b) => a.postedOn.localeCompare(b.postedOn));
  if (reels.length === 0) return <Empty>릴스 인사이트 기록이 없습니다. 인스타 성과에서 릴스를 기록해 주세요.</Empty>;

  const withSkip = reels.filter((r) => r.skipRate !== null);
  const withWatch = reels.filter((r) => r.avgWatchSec !== null && r.durationSec);
  const withCurve = reels.filter((r) => r.retention && r.retention.length > 1);
  const withSrc = reels.filter((r) => r.srcReels !== null || r.srcExplore !== null || r.srcProfile !== null || r.srcFollow !== null);
  const maxViews = Math.max(1, ...reels.map((r) => r.views ?? r.reach));

  const avgSkip = withSkip.length > 0 ? withSkip.reduce((n, r) => n + (r.skipRate ?? 0), 0) / withSkip.length : null;
  const totalViews = reels.reduce((n, r) => n + (r.views ?? r.reach), 0);
  const totalFollows = reels.reduce((n, r) => n + r.followsGained, 0);
  const totalVisits = reels.reduce((n, r) => n + r.profileVisits, 0);
  const totalLikes = reels.reduce((n, r) => n + r.likes, 0);
  const totalSaves = reels.reduce((n, r) => n + r.saves, 0);
  const totalShares = reels.reduce((n, r) => n + r.shares, 0);
  const similarViews = reels.filter((r) => (r.views ?? 0) >= 90 && (r.views ?? 0) <= 140).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="분석한 릴스" value={`${reels.length}개`} hint="10개 이상부터 경향을 믿을 수 있음" />
        <Stat label="총 조회" value={fmt(totalViews)} />
        <Stat label="평균 건너뛰기" value={avgSkip === null ? "-" : `${avgSkip.toFixed(1)}%`} hint="낮을수록 좋음" />
        <Stat label="총 반응" value={fmt(totalLikes + totalSaves + totalShares)} hint="좋아요+저장+공유" />
        <Stat label="새 팔로워" value={`+${fmt(totalFollows)}`} />
      </div>

      <Diagnosis
        reels={reels}
        avgSkip={avgSkip}
        similarViews={similarViews}
        retention3={withCurve.map((r) => ({ r, v: retentionAt(r.retention ?? [], 3) })).filter((x) => x.v !== null) as { r: InstagramPostRow; v: number }[]}
      />

      <Card>
        <h2 className="font-semibold">영상 구성 점검 (파일에서 직접 측정)</h2>
        <p className="mt-1 text-xs text-muted">4개 모두 슬라이드쇼형입니다. 앞의 세 개는 처음 2~5초 동안 화면이 거의 안 변했고(위 차트에서 건너뛰기가 높게 나온 이유와 맞닿아 있음), 던리비는 0초부터 글씨가 보이고 1.8초에 첫 문구가 바뀌는 점이 다릅니다. 길이는 17~40초입니다. 표본이 작아 가설로 보세요.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-xs">
            <thead className="text-subtle">
              <tr>
                <th className="py-1 pr-3 font-medium">날짜</th>
                <th className="py-1 pr-3 font-medium">릴스</th>
                <th className="py-1 pr-3 font-medium">길이</th>
                <th className="py-1 pr-3 font-medium">소리</th>
                <th className="py-1 pr-3 font-medium">첫 변화</th>
                <th className="py-1 font-medium">구성 메모</th>
              </tr>
            </thead>
            <tbody className="align-top text-muted">
              {VIDEO_FACTS.map((v) => (
                <tr key={v.date} className="border-t border-line">
                  <td className="py-2 pr-3 whitespace-nowrap">{v.date}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-foreground">{v.title}</td>
                  <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{v.length}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{v.sound}</td>
                  <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{v.firstChange}</td>
                  <td className="py-2">{v.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">다음 릴스 실험 계획</h2>
        <p className="mt-1 text-xs text-muted">한 번에 하나만 바꾸고, 같은 조건으로 3개씩 올린 뒤 위 차트의 평균으로 판단합니다. 통과 기준은 건너뛰기·3초 유지율·반응 수입니다. 던리비 결과를 보고 화면 변화부터 시험하도록 순서를 바꿨습니다.</p>
        <ul className="mt-3 space-y-2 text-sm">
          {EXPERIMENTS.map((e, i) => (
            <li key={`${i}-${e.when}`} className="rounded-md border border-line px-3 py-2">
              <p className="text-xs font-medium text-jade-ink">{e.when}</p>
              <p className="mt-0.5 text-muted">{e.change}</p>
              <p className="mt-0.5 text-xs text-subtle">통과 기준: {e.pass}</p>
            </li>
          ))}
        </ul>
      </Card>

      <ChartCard title="릴스별 조회" note="조회가 비슷한 숫자에서 멈추면 인스타가 처음 소수에게 보여 준 뒤 더 퍼뜨리지 않았다는 신호입니다.">
        <Bars rows={reels.map((r) => ({ key: r.id, label: label(r), value: r.views ?? r.reach, max: maxViews, text: fmt(r.views ?? r.reach), color: "#4f78a8" }))} />
      </ChartCard>

      <ChartCard title="건너뛰기 비율" note="첫 장면에서 넘긴 비율입니다. 60% 아래가 첫 목표, 70%를 넘으면 도입을 바꿔야 합니다. 빨간 선이 70%.">
        {withSkip.length === 0 ? (
          <Empty>건너뛰기 비율 기록이 없습니다.</Empty>
        ) : (
          <Bars rows={withSkip.map((r) => ({ key: r.id, label: label(r), value: r.skipRate ?? 0, max: 100, text: `${(r.skipRate ?? 0).toFixed(1)}%`, color: (r.skipRate ?? 0) > 70 ? "#b5543a" : "#3f8f84" }))} marker={70} />
        )}
      </ChartCard>

      <ChartCard title="평균 시청 시간 ÷ 영상 길이" note="영상을 평균 몇 %까지 봤는지입니다. 길이가 길수록 값이 낮아지니, 길이를 줄여 보고 비교하세요.">
        {withWatch.length === 0 ? (
          <Empty>평균 조회 시간과 영상 길이 기록이 없습니다.</Empty>
        ) : (
          <Bars rows={withWatch.map((r) => ({ key: r.id, label: label(r), value: ((r.avgWatchSec ?? 0) / (r.durationSec ?? 1)) * 100, max: 100, text: `${r.avgWatchSec}초 / ${r.durationSec}초 (${(((r.avgWatchSec ?? 0) / (r.durationSec ?? 1)) * 100).toFixed(0)}%)`, color: "#a07a2c" }))} />
        )}
      </ChartCard>

      <ChartCard title="시청 유지 곡선" note="재생 후 시간이 지나며 남은 시청자 비율입니다. 점선은 3초. 곡선이 3초 전에 급하게 떨어지면 첫 장면 문제입니다. (그래프에서 읽은 근사값)">
        {withCurve.length === 0 ? <Empty>유지 곡선 기록이 없습니다.</Empty> : <Curves reels={withCurve} />}
      </ChartCard>

      <ChartCard title="조회 출처" note="릴스 탭·탐색 탭이 높으면 추천으로 노출되는 중입니다. 팔로워 비율이 낮은 것은 아직 팔로워가 거의 없기 때문입니다.">
        {withSrc.length === 0 ? (
          <Empty>조회 출처 기록이 없습니다.</Empty>
        ) : (
          <div className="space-y-2">
            {withSrc.map((r) => {
              const parts = [
                ["릴스 탭", r.srcReels, COLORS[0]],
                ["탐색 탭", r.srcExplore, COLORS[2]],
                ["프로필", r.srcProfile, COLORS[3]],
                ["팔로워 등", r.srcFollow, COLORS[4]],
              ] as const;
              return (
                <div key={r.id} className="text-sm">
                  <p className="text-xs text-muted">{label(r)}</p>
                  <div className="mt-1 flex h-4 overflow-hidden rounded-full bg-line/60">
                    {parts.map(([name, v, c]) => (v ? <span key={name} title={`${name} ${v}%`} style={{ width: `${v}%`, background: c }} /> : null))}
                  </div>
                </div>
              );
            })}
            <p className="flex flex-wrap gap-3 pt-1 text-xs text-muted">
              {[["릴스 탭", COLORS[0]], ["탐색 탭", COLORS[2]], ["프로필", COLORS[3]], ["팔로워 등", COLORS[4]]].map(([n, c]) => (
                <span key={n} className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ background: c }} />
                  {n}
                </span>
              ))}
            </p>
          </div>
        )}
      </ChartCard>

      <ChartCard title="조회에서 팔로우까지" note="한 단계씩 줄어드는 폭을 봅니다. 조회가 있는데 프로필 방문이 0이면 릴스 끝에 '다음에 볼 곳'이 없다는 뜻입니다.">
        <Bars
          rows={[
            { key: "v", label: "조회", value: totalViews, max: totalViews, text: fmt(totalViews), color: "#4f78a8" },
            { key: "l", label: "반응 (좋아요·저장·공유)", value: totalLikes + totalSaves + totalShares, max: totalViews, text: fmt(totalLikes + totalSaves + totalShares), color: "#3f8f84" },
            { key: "p", label: "프로필 방문", value: totalVisits, max: totalViews, text: fmt(totalVisits), color: "#a07a2c" },
            { key: "f", label: "새 팔로워", value: totalFollows, max: totalViews, text: fmt(totalFollows), color: "#b5543a" },
          ]}
        />
      </ChartCard>
    </div>
  );
}

function Diagnosis({ reels, avgSkip, similarViews, retention3 }: { reels: InstagramPostRow[]; avgSkip: number | null; similarViews: number; retention3: { r: InstagramPostRow; v: number }[] }) {
  const items: string[] = [];
  if (reels.length < 10) items.push(`릴스가 ${reels.length}개뿐이라 경향을 확정하기는 이릅니다. 지금은 가설을 세우고, 같은 형식으로 3~5개를 더 올려 평균으로 판단하세요.`);
  if (avgSkip !== null && avgSkip > 70) items.push(`평균 건너뛰기가 ${avgSkip.toFixed(0)}%로 높습니다. 노출은 되는데 첫 장면이 붙잡지 못하는 상태입니다. 첫 1초에 큰 글씨 한 줄(질문·핵심)과 움직임을 넣어 보세요.`);
  if (similarViews >= 2) items.push(`조회가 100대에서 멈춘 릴스가 ${similarViews}개입니다. 추천 시스템이 처음 소수에게만 보여 준 뒤 확산을 멈춘 패턴일 수 있습니다. 조회수가 아니라 건너뛰기와 3초 유지율을 올리는 것이 먼저입니다.`);
  const worst = [...retention3].sort((a, b) => a.v - b.v)[0];
  if (worst && worst.v < 30) items.push(`3초 시점 유지율이 가장 낮은 릴스는 "${worst.r.title}"(약 ${worst.v.toFixed(0)}%)입니다. 도입 문장을 바꾼 버전을 다음에 올려 비교해 보세요.`);
  const noFollow = reels.reduce((n, r) => n + r.followsGained, 0) === 0 && reels.reduce((n, r) => n + (r.views ?? r.reach), 0) > 100;
  if (noFollow) items.push("조회는 있는데 팔로우가 0입니다. 릴스 끝 장면에 '이런 사건을 매일 기록합니다 · 프로필 링크'처럼 따라올 이유를 한 줄 넣어 보세요.");
  if (items.length === 0) items.push("뚜렷한 경고 신호가 없습니다. 같은 형식을 이어 가며 표본을 늘리세요.");
  return (
    <Card>
      <h2 className="font-semibold">지금 읽히는 것</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-subtle">입력한 숫자로 자동 계산한 참고 의견이며, 표본이 적을 때는 우연일 수 있습니다.</p>
    </Card>
  );
}

function ChartCard({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted">{note}</p>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function Bars({ rows, marker }: { rows: { key: string; label: string; value: number; max: number; text: string; color: string }[]; marker?: number }) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3 text-xs sm:grid-cols-[12rem_1fr_auto]">
          <span className="truncate text-muted">{r.label}</span>
          <span className="relative h-3 rounded-full bg-line/60">
            <span className="block h-3 rounded-full" style={{ width: `${Math.min(100, (r.value / (r.max || 1)) * 100)}%`, background: r.color }} />
            {marker !== undefined && <span className="absolute inset-y-[-2px] w-px bg-clay" style={{ left: `${marker}%` }} />}
          </span>
          <span className="tabular-nums">{r.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Curves({ reels }: { reels: InstagramPostRow[] }) {
  const W = 420;
  const H = 200;
  const pad = { l: 34, r: 10, t: 10, b: 24 };
  const maxT = Math.max(...reels.map((r) => Math.max(...(r.retention ?? []).map((x) => x.t), r.durationSec ?? 0)), 5);
  const x = (t: number) => pad.l + (t / maxT) * (W - pad.l - pad.r);
  const y = (p: number) => pad.t + (1 - p / 100) * (H - pad.t - pad.b);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="릴스별 시청 유지 곡선" className="w-full max-w-xl">
        {[0, 50, 100].map((p) => (
          <g key={p}>
            <line x1={pad.l} x2={W - pad.r} y1={y(p)} y2={y(p)} stroke="currentColor" strokeOpacity={0.12} />
            <text x={pad.l - 6} y={y(p) + 3} textAnchor="end" fontSize={9} fill="currentColor" fillOpacity={0.6}>{p}%</text>
          </g>
        ))}
        <line x1={x(3)} x2={x(3)} y1={pad.t} y2={H - pad.b} stroke="#b5543a" strokeDasharray="3 3" />
        <text x={x(3) + 3} y={pad.t + 9} fontSize={9} fill="#b5543a">3초</text>
        {[0, Math.round(maxT / 2), Math.round(maxT)].map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.6}>{t}초</text>
        ))}
        {reels.map((r, i) => (
          <polyline key={r.id} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={2} strokeLinejoin="round" points={[...(r.retention ?? [])].sort((a, b) => a.t - b.t).map((pt) => `${x(pt.t)},${y(pt.p)}`).join(" ")} />
        ))}
      </svg>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {reels.map((r, i) => (
          <span key={r.id} className="inline-flex items-center gap-1">
            <span className="h-0.5 w-4" style={{ background: COLORS[i % COLORS.length] }} />
            {label(r)}
          </span>
        ))}
      </p>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
    </Card>
  );
}
