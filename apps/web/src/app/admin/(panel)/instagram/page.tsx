import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { addInstagramPost, deleteInstagramPost, updateInstagramPost } from "@/app/admin/actions";
import { ActionForm, Button } from "@/components/admin/ActionForm";
import { InstagramPostFields } from "@/components/admin/InstagramPostFields";
import { Card, Empty, ErrorBox, PageTitle, Skeleton } from "@/components/admin/ui";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { Analytics, InstagramPostRow, InstagramPosts } from "@/lib/admin/types";

export const metadata: Metadata = { title: "인스타 성과" };

const KIND_LABEL = { STORY: "스토리", FEED: "피드", REEL: "릴스" } as const;
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "-");
const sum = (rows: InstagramPostRow[], k: keyof Pick<InstagramPostRow, "reach" | "likes" | "saves" | "shares" | "profileVisits" | "followsGained">) =>
  rows.reduce((n, r) => n + r[k], 0);

export default function InstagramPage() {
  return (
    <>
      <PageTitle
        title="인스타 성과"
        description="올린 게시물과 반응 숫자를 기록하고, 올린 날 사이트 방문이 얼마나 늘었는지 함께 봅니다. 숫자는 인스타 인사이트 화면을 보고 직접 입력합니다."
      />
      <div className="space-y-8">
        <Suspense fallback={<Skeleton />}>
          <Dashboard />
        </Suspense>
        <Card>
          <h2 className="font-semibold">릴스 분석 차트</h2>
          <p className="mt-1 text-sm text-muted">건너뛰기 비율, 시청 유지 곡선, 조회 출처를 릴스별로 비교합니다.</p>
          <Link href="/admin/instagram/reels" className="mt-3 inline-block text-xs font-medium text-jade-ink hover:opacity-70">
            릴스 분석 열기
          </Link>
        </Card>
        <Card>
          <h2 className="font-semibold">성장 계획</h2>
          <p className="mt-1 text-sm text-muted">목표 단계, 수익 3트랙 분석, 릴스 하루 1개 현황은 따로 모았습니다.</p>
          <Link href="/admin/growth" className="mt-3 inline-block text-xs font-medium text-jade-ink hover:opacity-70">
            성장 계획 열기
          </Link>
        </Card>
        <Card>
          <h2 className="font-semibold">글감 만들기</h2>
          <p className="mt-1 text-sm text-muted">기념일·사건 문구와 스토리 이미지는 따로 모아 두었습니다.</p>
          <Link href="/admin/instagram/ideas" className="mt-3 inline-block text-xs font-medium text-jade-ink hover:opacity-70">
            인스타 글감 열기
          </Link>
        </Card>
      </div>
    </>
  );
}

async function Dashboard() {
  let data: InstagramPosts;
  let daily: Analytics["daily"] = [];
  try {
    data = await adminGet<InstagramPosts>("/instagram/posts");
    daily = (await adminGet<Analytics>("/analytics?days=60").catch(() => null))?.daily ?? [];
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const recent = data.items.filter((p) => p.postedOn >= since);
  const maxReach = Math.max(1, ...recent.map((p) => p.reach));
  const viewsByDay = new Map(daily.map((d) => [d.day, d.views]));
  const avgViews = daily.length > 0 ? daily.reduce((n, d) => n + d.views, 0) / daily.length : 0;

  return (
    <>
      <section>
        <h2 className="text-lg font-semibold">최근 30일</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="게시물" value={`${recent.length}개`} />
          <Stat label="총 도달" value={sum(recent, "reach").toLocaleString("ko-KR")} />
          <Stat label="저장률" value={pct(sum(recent, "saves"), sum(recent, "reach"))} hint="저장 ÷ 도달" />
          <Stat label="프로필 방문" value={sum(recent, "profileVisits").toLocaleString("ko-KR")} />
          <Stat label="새 팔로워" value={`+${sum(recent, "followsGained").toLocaleString("ko-KR")}`} />
        </div>
      </section>

      <Card>
        <h2 className="font-semibold">게시물 기록하기</h2>
        <div className="mt-3">
          <ActionForm action={addInstagramPost}>
            <InstagramPostFields today={new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)} />
            <Button tone="primary">기록</Button>
          </ActionForm>
        </div>
      </Card>

      <section>
        <h2 className="text-lg font-semibold">게시물별 도달</h2>
        {recent.length === 0 ? (
          <div className="mt-3">
            <Empty>최근 30일에 기록한 게시물이 없습니다.</Empty>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent.slice(0, 12).map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 text-xs text-subtle tabular-nums">{p.postedOn.slice(5)}</span>
                <span className="w-32 shrink-0 truncate">{p.title}</span>
                <span className="h-3 flex-1 rounded-full bg-line/60">
                  <span className="block h-3 rounded-full bg-jade" style={{ width: `${(p.reach / maxReach) * 100}%` }} />
                </span>
                <span className="w-16 shrink-0 text-right text-xs tabular-nums">{p.reach.toLocaleString("ko-KR")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">올린 날 사이트 방문</h2>
        <p className="mt-1 text-sm text-muted">게시 당일 사이트 조회수를 최근 60일 하루 평균과 비교합니다.</p>
        <div className="mt-3 space-y-2">
          {data.items.slice(0, 10).map((p) => {
            const views = viewsByDay.get(p.postedOn);
            const diff = views !== undefined && avgViews > 0 ? Math.round(((views - avgViews) / avgViews) * 100) : null;
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-line px-3 py-2 text-sm">
                <span className="text-xs text-subtle tabular-nums">{p.postedOn}</span>
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                <span className="text-xs tabular-nums text-muted">
                  {views === undefined ? "기록 없음" : `${views.toLocaleString("ko-KR")}회`}
                  {diff !== null && (
                    <span className={diff >= 0 ? "ml-2 text-jade-ink" : "ml-2 text-clay-ink"}>
                      평균보다 {diff >= 0 ? "+" : ""}{diff}%
                    </span>
                  )}
                </span>
              </div>
            );
          })}
          {data.items.length === 0 && <Empty>기록한 게시물이 없습니다.</Empty>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">기록한 게시물</h2>
        <div className="mt-3 space-y-2">
          {data.items.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-subtle">{p.postedOn} · {KIND_LABEL[p.kind]}</p>
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-1 text-xs text-muted tabular-nums">
                    도달 {p.reach.toLocaleString("ko-KR")} · 좋아요 {p.likes} · 저장 {p.saves} · 공유 {p.shares} · 프로필 {p.profileVisits} · 팔로워 +{p.followsGained}
                  </p>
                  {p.note && <p className="mt-1 text-xs text-subtle">{p.note}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionForm action={deleteInstagramPost.bind(null, p.id)} confirmMessage="이 기록을 삭제할까요?" inline>
                    <Button tone="danger">삭제</Button>
                  </ActionForm>
                </div>
              </div>
              <details className="mt-3 rounded-md border border-line px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium">수정</summary>
                <div className="mt-3">
                  <ActionForm action={updateInstagramPost.bind(null, p.id)}>
                    <InstagramPostFields post={p} />
                    <Button tone="primary">저장</Button>
                  </ActionForm>
                </div>
              </details>
            </Card>
          ))}
        </div>
      </section>
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
