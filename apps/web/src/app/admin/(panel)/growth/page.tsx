import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, ErrorBox, PageTitle, Skeleton } from "@/components/admin/ui";
import { GrowthNotes } from "@/components/admin/GrowthNotes";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { InstagramPosts } from "@/lib/admin/types";
import { INSTAGRAM_URL } from "@/lib/site";

export const metadata: Metadata = { title: "성장 계획" };

const CHECKLIST = [
  "오늘 릴스 1개 올림",
  "이번 주 릴스 중 저장·공유가 가장 많았던 1개 기록",
  "릴스 설명란·프로필에 사이트 주소 연결 확인",
  "이번 주 방문자 분석에서 인스타 유입 확인",
  "후원 안내 문구 초안 작성 (운영비 항목 공개)",
  "피해자·유족 표현 점검 (사진·실명·추측 없음)",
];

const TRACKS = [
  {
    title: "1. 운영비 자율 후원",
    when: "방문자가 꾸준히 생긴 뒤 (월 방문 수백 명~)",
    real: "가장 먼저 가능하지만 금액은 작음. 일반적인 경험칙상 방문자 중 후원하는 비율은 1% 안팎 이하로 알려져 있어(확인 필요), 월 방문 100명이면 기대액은 0원~수만 원 수준. 목표는 '수익'이 아니라 서버·DB 같은 운영비를 덮는 것.",
    need: ["운영비 항목과 금액을 공개 (신뢰의 핵심)", "후원은 강요가 아닌 선택임을 명시", "받는 창구 확정 (개인 후원 서비스 vs 비영리 모금 플랫폼)"],
    risk: "개인이 후원을 받으면 소득 신고 대상일 수 있음. 모금 규모가 커지면 기부금품 관련 규정 확인 필요. 세무·법률은 전문가 확인.",
  },
  {
    title: "2. 인스타 채널 수익·협업",
    when: "팔로워·도달이 쌓인 뒤 (최소 수백~수천 팔로워, 릴스 도달 안정)",
    real: "팔로워 0~수백 단계에서는 사실상 0원. 이 주제는 광고주 입장에서 '브랜드 안전성' 때문에 일반 협찬 단가가 낮거나 제한될 수 있고, 인스타 자체 수익 프로그램의 제공 여부·조건은 계정·국가별로 달라 직접 확인해야 함. 현실적인 첫 협업은 상업 광고가 아니라 공익기관·상담 서비스·출판사·교육 콘텐츠와의 정보 협력.",
    need: ["릴스 20개 이상의 도달·저장 데이터", "'이 계정은 무엇을 하는가'가 한 줄로 설명되는 프로필", "협업 제안서 한 장 (대상 독자, 평균 도달, 윤리 기준)"],
    risk: "선정적 소비가 되면 취지가 훼손됨. 피해자·유족 보호 기준을 먼저 세우고, 어떤 광고·협업은 받지 않는지 미리 정해 둘 것.",
  },
  {
    title: "3. 취지와 맞닿은 굿즈·아카이브 프로젝트",
    when: "신뢰가 쌓인 뒤 (팔로워와 후원자가 있고 요청이 생길 때)",
    real: "수익보다 취지 확장에 가까움. 사건 자체를 상품화하면 반발 위험이 큼. 바람개비·'Wishwind' 상징 굿즈, 실종 예방 안내 카드, 연도별 기록집(PDF·소책자) 같은 형태가 안전함. 일부를 관련 기관에 기부하고 내역을 공개하는 구조가 전제.",
    need: ["상표·디자인 권리 정리", "제작·배송·환불 구조 (소량 주문형 제작 먼저)", "수익 사용처 공개 원칙"],
    risk: "물건을 판매하면 통신판매업 신고 등 사업 요건이 생길 수 있음. 사건 이름·피해자 이미지를 굿즈에 쓰지 않을 것.",
  },
];

const PHASES = [
  { name: "0단계 · 신뢰 만들기 (지금)", goal: "릴스 하루 1개를 30일 지속, 프로필·링크·사이트 연결 완성", metric: "릴스 30개, 저장률 기록 시작", money: "0원이 정상" },
  { name: "1단계 · 방문 100명", goal: "인스타에서 사이트로 오는 흐름 만들기 (릴스 → 프로필 링크 → 사건방)", metric: "월 방문 100명, 인스타 유입 비율 확인", money: "후원 안내만 준비, 요청은 보류" },
  { name: "2단계 · 후원 열기", goal: "운영비 공개 + 자율 후원 창구 열기", metric: "월 방문 300~500명, 팔로워 수백", money: "운영비 일부 충당이 목표" },
  { name: "3단계 · 협업·굿즈", goal: "공익 협업 제안, 소량 굿즈·아카이브 시범", metric: "릴스 도달 안정, 협업 문의 발생", money: "취지 유지가 우선, 수익은 부산물" },
];

export default function GrowthPage() {
  return (
    <>
      <PageTitle title="성장 계획" description="목표와 단계, 수익 3트랙의 현실성, 릴스 하루 1개 운영 현황을 한곳에 모았습니다. 판단 근거는 이 사이트의 기록과 일반적인 경험칙이며, 외부 수치는 확인이 필요합니다." />
      <div className="space-y-8">
        <Card>
          <h2 className="font-semibold">냉정한 진단</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
            <li>
              현재 팔로워가 거의 없으니 수익이 0원인 것은 정상입니다. 지금 단계에서 수익 이야기는 이릅니다. 지금 만드는 것은 &lsquo;신뢰와 반복 노출&rsquo;입니다. (인스타 <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer noopener" className="underline">@wishwind.official</a> 화면은 이 분석에서 직접 열어 보지 못했고, 팔로워·게시물 수는 아래 기록과 말씀하신 내용을 기준으로 합니다.)
            </li>
            <li>가장 큰 강점은 사이트에 이미 &lsquo;볼 곳&rsquo;이 있다는 점입니다. 릴스를 본 사람이 사건방·브리핑으로 이어질 수 있어 단순 계정보다 체류가 깁니다.</li>
            <li>가장 큰 약점은 소재가 민감해 광고·협찬 시장이 좁고, 인스타 추천에서 제한받을 수 있다는 점입니다. 수익 모델이 광고에만 기대면 위험합니다. 후원·공익 협업·아카이브처럼 &lsquo;신뢰 기반&rsquo; 수익이 맞습니다.</li>
            <li>방문자 100명은 첫 목표로 좋지만, 그 규모의 수익은 크지 않습니다. 목표는 &lsquo;운영비 충당&rsquo;으로 잡고, 그 이상은 신뢰가 쌓인 뒤 단계적으로 보는 것이 현실적입니다.</li>
            <li>하루 릴스 1개는 좋은 선택입니다. 다만 30일 동안은 조회수보다 &lsquo;저장·공유가 많은 형식 찾기&rsquo;를 목표로 하고, 반응 좋은 형식 2~3개만 반복하는 편이 낫습니다.</li>
          </ul>
        </Card>

        <Suspense fallback={<Skeleton />}>
          <ReelStatus />
        </Suspense>

        <section>
          <h2 className="text-lg font-semibold">단계별 목표</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {PHASES.map((p) => (
              <Card key={p.name}>
                <p className="font-medium">{p.name}</p>
                <p className="mt-1 text-sm text-muted">{p.goal}</p>
                <p className="mt-2 text-xs text-subtle">지표: {p.metric}</p>
                <p className="text-xs text-subtle">수익: {p.money}</p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">수익 3트랙 현실성</h2>
          <div className="mt-3 space-y-3">
            {TRACKS.map((t) => (
              <Card key={t.title}>
                <p className="font-medium">{t.title}</p>
                <p className="mt-1 text-xs text-subtle">시작 시점: {t.when}</p>
                <p className="mt-2 text-sm text-muted">{t.real}</p>
                <p className="mt-2 text-xs font-medium">먼저 갖출 것</p>
                <ul className="list-disc pl-5 text-xs text-muted">
                  {t.need.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-clay-ink">주의: {t.risk}</p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">릴스 하루 1개 운영 원칙</h2>
          <Card className="mt-3">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>형식은 3개로 고정: 오늘의 기념일·사건, 사건을 푸는 기술 한 가지, 법·제도 변화. 글감은 <Link href="/admin/instagram/ideas" className="underline">인스타 글감</Link>에서 가져옵니다.</li>
              <li>첫 2초에 질문이나 핵심 한 줄. 끝에는 &lsquo;저장해 두세요&rsquo; 또는 &lsquo;프로필 링크에서 전체 사건 보기&rsquo; 한 가지만 요청.</li>
              <li>올린 날 바로 <Link href="/admin/instagram" className="underline">인스타 성과</Link>에 도달·저장·공유·프로필 방문·새 팔로워를 기록합니다. 기록이 없으면 분석이 안 됩니다.</li>
              <li>일주일에 한 번, 저장률 상위 2개와 하위 2개를 비교해 다음 주 형식을 정합니다. 30개가 쌓이기 전에는 결론 내리지 않습니다.</li>
              <li>피해자 사진·얼굴, 확정 전 실명, 추측성 표현은 쓰지 않습니다.</li>
            </ul>
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold">목표·점검·메모</h2>
          <Card className="mt-3">
            <GrowthNotes checklist={CHECKLIST} />
          </Card>
        </section>
      </div>
    </>
  );
}

async function ReelStatus() {
  await connection();
  let data: InstagramPosts;
  try {
    data = await adminGet<InstagramPosts>("/instagram/posts");
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  const kst = new Date(Date.now() + 9 * 3_600_000);
  const day = (offset: number) => new Date(kst.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
  const reelDays = new Set(data.items.filter((p) => p.kind === "REEL").map((p) => p.postedOn));
  const last14 = Array.from({ length: 14 }, (_, i) => day(13 - i));
  const done14 = last14.filter((d) => reelDays.has(d)).length;
  // 오늘 안 올렸으면 어제까지의 연속일을 셈
  let streak = 0;
  for (let i = reelDays.has(day(0)) ? 0 : 1; reelDays.has(day(i)); i++) streak++;
  const reels = data.items.filter((p) => p.kind === "REEL");
  const reach = reels.reduce((n, p) => n + p.reach, 0);
  const saves = reels.reduce((n, p) => n + p.saves, 0);
  const followers = data.items.reduce((n, p) => n + p.followsGained, 0);

  return (
    <section>
      <h2 className="text-lg font-semibold">릴스 현황</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="연속 업로드" value={`${streak}일`} hint="하루 1개 기준" />
        <Stat label="최근 14일" value={`${done14}/14일`} hint="릴스를 기록한 날" />
        <Stat label="릴스 누적" value={`${reels.length}개`} hint="30개가 첫 분석 기준" />
        <Stat label="릴스 저장률" value={reach > 0 ? `${((saves / reach) * 100).toFixed(1)}%` : "-"} hint="저장 ÷ 도달" />
        <Stat label="기록된 새 팔로워" value={`+${followers}`} hint="게시물 기록 합계" />
      </div>
      <div className="mt-3 flex gap-0.5" aria-label="최근 14일 릴스 업로드 기록">
        {last14.map((d) => (
          <span key={d} title={d} className={`h-2 flex-1 rounded-full ${reelDays.has(d) ? "bg-jade" : "bg-line"}`} />
        ))}
      </div>
    </section>
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
