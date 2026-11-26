import Link from "next/link";
import { LuPin } from "react-icons/lu";
import { TimeAgo } from "@/components/common/TimeAgo";
import type { BoardItem } from "@/components/briefing/DepartureBoard";
// 안내판형(DepartureBoard)도 남겨 둠. 같은 items로 바꿔 끼울 수 있음
import { HeadlineBoard } from "@/components/briefing/HeadlineBoard";
import { ParticipationBanner } from "@/components/briefing/ParticipationBanner";
import { getBriefing, type Briefing, type BriefingKind, type BriefingPost } from "@/lib/briefing/api";
import { ApiUnavailableError } from "@/lib/cases/api";
import { CATEGORY_COLOR, CATEGORY_LABEL, COUNTRY_LABEL, caseRoomCountry, caseStamp, stampOfKey } from "@/lib/cases/labels";
import type { Country } from "@/lib/cases/types";

const KIND: Record<BriefingKind, { label: string; color: string; tab: string }> = {
  NOTICE: { label: "공지", color: "#4f78a8", tab: "NOTICE" },
  NEWS: { label: "새 소식", color: "#3f8f84", tab: "NEWS" },
  CASE_UPDATE: { label: "사건 변경", color: "#c46a4b", tab: "UPDATE" },
  OPINION: { label: "사람들의 생각", color: "#8a5f8f", tab: "VOICES" },
};

const dateFmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const formatDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "");
const timeFmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const formatTime = (iso: string | null) => (iso ? timeFmt.format(new Date(iso)) : "--:--");
const BOARD_MAX = 10;
// API가 아직 board를 주지 않는 경우(배포 순서·캐시)에도 페이지가 깨지지 않도록
const POSTS_SHOWN = 3;

/** 새 소식과 브리핑 글을 최근 순으로 섞어 안내판에 올릴 10개를 고름 */
function boardItems(data: Briefing): BoardItem[] {
  const news = data.news.map((n) => ({
    at: n.publishedAt,
    item: {
      id: `news-${n.id}`,
      time: formatTime(n.publishedAt),
      kind: KIND.NEWS.label,
      kindColor: KIND.NEWS.color,
      title: n.titleKo ?? n.title,
      region: n.region,
      source: n.publisher,
      href: n.url,
      external: true,
    },
  }));
  const posts = data.posts.map((p) => ({
    at: p.publishedAt,
    item: {
      id: `post-${p.id}`,
      time: formatTime(p.publishedAt),
      kind: KIND[p.kind].label,
      kindColor: KIND[p.kind].color,
      title: p.title,
      region: "",
      source: "브리핑룸",
      href: p.case ? `/cases/${p.case.slug}` : `#post-${p.id}`,
      external: false,
    },
  }));
  return [...news, ...posts]
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""))
    .slice(0, BOARD_MAX)
    .map((x) => x.item);
}


export function BriefingSkeleton() {
  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px]" aria-busy>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-line/50" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-line/50" />
    </div>
  );
}

export async function BriefingFeed() {
  let data: Briefing;
  try {
    data = await getBriefing();
  } catch (error) {
    // 브리핑룸은 부가 페이지라 API 오류가 나도 페이지 전체를 깨뜨리지 않고 안내만 보여 줌
    console.error(error instanceof ApiUnavailableError ? error.message : error);
    return <p className="mt-10 text-sm text-muted">브리핑을 불러오지 못했습니다. 잠시 뒤 다시 와 주세요.</p>;
  }
  return (
    <div className="mt-10 space-y-10">
      {data.notices.length > 0 && <Notices notices={data.notices} />}
      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <section aria-labelledby="feed-title" className="min-w-0">
          <h2 id="feed-title" className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-subtle">
            Today&apos;s Briefing
          </h2>
          <HeadlineBoard
            items={boardItems(data)}
            footer={data.news.length > 0 ? <NewsList news={data.news} /> : undefined}
          />
          {data.posts.length === 0 ? (
            data.news.length === 0 && (
              <p className="rounded-xl border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
                아직 올라온 브리핑이 없습니다. 새 소식이 생기면 이곳에 정리해 두겠습니다.
              </p>
            )
          ) : (
            <>
              <ul className="space-y-4">
                {data.posts.slice(0, POSTS_SHOWN).map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </ul>
              {data.posts.length > POSTS_SHOWN && (
                <details className="group mt-4">
                  <summary className="cursor-pointer list-none text-sm text-muted hover:text-foreground">
                    <span className="group-open:hidden">브리핑 {data.posts.length - POSTS_SHOWN}개 더 보기 ↓</span>
                    <span className="hidden group-open:inline">접기 ↑</span>
                  </summary>
                  <ul className="mt-4 space-y-4">
                    {data.posts.slice(POSTS_SHOWN).map((p) => (
                      <PostCard key={p.id} post={p} />
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
          <ParticipationBanner participation={data.participation} caseCount={data.stats.total} />
        </section>
        <aside className="space-y-8">
          <CaseStats stats={data.stats} />
          <NewMissing missing={data.missing} />
        </aside>
      </div>
      <RecentCases cases={data.recentCases} />
    </div>
  );
}


const REGION_FLAG = { KR: "🇰🇷", US: "🇺🇸", GB: "🇬🇧", JP: "🇯🇵", CN: "🇨🇳", OTHER: "🌐" } as const;

/** 헤드라인판 아래 한 줄. 펼치면 새 소식 전체 목록 (기사 본문은 옮기지 않고 제목·언론사·원문 링크만) */
function NewsList({ news }: { news: Briefing["news"] }) {
  return (
    <details className="group border-t border-line px-5 py-2.5">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-muted hover:text-foreground">
        <span className="font-mono text-[11px] tracking-wider text-jade-ink-soft">NEWS</span>
        <span className="group-open:hidden">새 소식 전체 보기 ({news.length}건) ↓</span>
        <span className="hidden group-open:inline">접기 ↑</span>
      </summary>
      <ul className="mt-1 divide-y divide-line/70">
        {news.map((n) => (
          <NewsItem key={n.id} n={n} />
        ))}
      </ul>
      <p className="mt-1 text-[11px] text-subtle">기사 내용은 각 언론사 원문에서 확인해 주세요.</p>
    </details>
  );
}

function NewsItem({ n }: { n: Briefing["news"][number] }) {
  return (
    <li className="py-2.5">
      <a href={n.url} target="_blank" rel="noreferrer noopener" className="font-medium leading-snug transition-opacity hover:opacity-70">
        {n.region !== "KR" && <span className="mr-1">{REGION_FLAG[n.region]}</span>}
        {n.titleKo ?? n.title}
      </a>
      <p className="mt-0.5 text-xs text-subtle">
        {n.publisher}
        {n.publishedAt && (
          <>
            {" · "}
            <TimeAgo iso={n.publishedAt} />
          </>
        )}
        {n.case && (
          <>
            {" · "}
            <Link href={`/cases/${n.case.slug}`} className="text-brand-fg transition-opacity hover:opacity-70">
              {n.case.title} 사건 파일
            </Link>
          </>
        )}
      </p>
    </li>
  );
}

function RecentCases({ cases }: { cases: Briefing["recentCases"] }) {
  if (cases.length === 0) return null;
  return (
    <section aria-labelledby="recent-title">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="recent-title" className="text-lg font-semibold">
          최근 들어온 사건 파일
        </h2>
        <Link href="/cases" className="text-sm text-brand-fg transition-opacity hover:opacity-70">
          사건방 전체 보기
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/cases/${c.slug}`}
              className="block h-full rounded-xl border border-line bg-surface p-4 transition-colors hover:border-foreground/30"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium" style={{ color: CATEGORY_COLOR[c.category] }}>
                  {CATEGORY_LABEL[c.category]}
                </span>
                <span
                  className="rounded-full border px-1.5 py-px text-[11px]"
                  style={{ color: caseStamp(c).color, borderColor: `${caseStamp(c).color}55` }}
                >
                  {caseStamp(c).label}
                </span>
                <span className="ml-auto text-subtle">{COUNTRY_LABEL[caseRoomCountry(c.country)]}</span>
              </div>
              <p className="mt-2 font-semibold leading-snug">{c.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{c.summary}</p>
              <p className="mt-2 text-xs text-subtle">등록 {formatDate(c.createdAt)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Notices({ notices }: { notices: BriefingPost[] }) {
  return (
    <section aria-label="공지사항" className="rounded-xl border border-steel/30 bg-steel/5 p-5">
      <ul className="space-y-3">
        {notices.map((n) => (
          <li key={n.id}>
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-2">
                {n.isPinned ? <LuPin aria-label="고정" className="size-4 text-steel-ink" /> : <span className="text-steel-ink">•</span>}
                <span className="text-xs font-semibold text-steel-ink">공지</span>
                <span className="font-medium">{n.title}</span>
                <span className="ml-auto shrink-0 text-xs text-subtle">{formatDate(n.publishedAt)}</span>
              </summary>
              <p className="mt-2 whitespace-pre-wrap pl-6 text-sm leading-relaxed text-muted">{n.body}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 사건 파일 메모지처럼 보이는 카드. 왼쪽 색 띠로 종류를 구분하고 글자 라벨도 함께 씀 */
function PostCard({ post }: { post: BriefingPost }) {
  const kind = KIND[post.kind];
  const long = post.body.length > 220;
  return (
    <li id={`post-${post.id}`} className="relative scroll-mt-24 overflow-hidden rounded-xl border border-line bg-surface p-5 pl-6 shadow-[0_1px_0_rgb(47_44_40/0.04)]">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: kind.color }} />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono font-semibold tracking-wider" style={{ color: kind.color }}>
          {kind.tab}
        </span>
        <span className="text-muted">{kind.label}</span>
        {post.isPinned && <LuPin aria-label="고정" className="size-3.5 text-subtle" />}
        <span className="ml-auto text-subtle">{formatDate(post.publishedAt)}</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold leading-snug">{post.title}</h3>
      {long ? (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-sm leading-relaxed text-muted">
            <span className="group-open:hidden">
              {post.body.slice(0, 200)}… <span className="text-foreground underline">더 읽기</span>
            </span>
          </summary>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{post.body}</p>
        </details>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{post.body}</p>
      )}
      {post.case && (
        <Link href={`/cases/${post.case.slug}`} className="mt-3 inline-block text-sm text-brand-fg transition-opacity hover:opacity-70">
          📁 {post.case.title} 사건 파일 보기
        </Link>
      )}
    </li>
  );
}

/** 사건방과 같게 중국은 기타로 합쳐 셈 */
function countryCounts(rows: { key: Country; count: number }[]) {
  const merged = new Map<Country, number>();
  for (const r of rows) {
    const k = caseRoomCountry(r.key);
    merged.set(k, (merged.get(k) ?? 0) + r.count);
  }
  // 기타는 맨 뒤, 나머지는 많은 순
  return [...merged.entries()].sort(([a, x], [b, y]) => (a === "OTHER" ? 1 : b === "OTHER" ? -1 : y - x));
}

function CaseStats({ stats }: { stats: Briefing["stats"] }) {
  const max = Math.max(1, ...stats.byCategory.map((c) => c.count));
  return (
    <section aria-labelledby="stats-title" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="stats-title" className="font-semibold">어떤 사건이 많을까요?</h2>
      <p className="mt-1 text-xs text-subtle">공개된 사건 파일 {stats.total}건 기준</p>
      <ul className="mt-4 space-y-2.5">
        {stats.byCategory.map((c) => (
          <li key={c.key} className="text-sm">
            <div className="flex justify-between">
              <span>{CATEGORY_LABEL[c.key]}</span>
              <span className="tabular-nums text-muted">{c.count}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-line/60">
              <div className="h-1.5 rounded-full" style={{ width: `${(c.count / max) * 100}%`, backgroundColor: CATEGORY_COLOR[c.key] }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        {stats.byStatus.map((s) => {
          const stamp = stampOfKey(s.key);
          if (!stamp) return null;
          return (
            <span
              key={s.key}
              className="rounded-full border px-2.5 py-0.5 text-xs"
              style={{ color: stamp.color, borderColor: `${stamp.color}55` }}
            >
              {stamp.label} {s.count}
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-subtle">
        {countryCounts(stats.byCountry).map(([k, n]) => `${COUNTRY_LABEL[k]} ${n}`).join(" · ")}
      </p>
    </section>
  );
}

function NewMissing({ missing }: { missing: Briefing["missing"] }) {
  if (missing.length === 0) return null;
  return (
    <section aria-labelledby="missing-title" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="missing-title" className="font-semibold">새로 등록된 실종자</h2>
      <p className="mt-1 text-sm text-muted">모두가 돌아올 수 있기를 바랍니다.</p>
      <p className="mt-0.5 text-[11px] text-subtle">FBI·경찰청 공개 정보를 바탕으로 합니다.</p>
      <ul className="mt-4 space-y-3 text-sm">
        {missing.map((m) => (
          <li key={m.id} className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{m.name}</span>
            <span className="shrink-0 text-xs text-muted">
              {m.region}
              {m.missingDate && ` · ${formatDate(m.missingDate)}`}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/missing" className="mt-4 inline-block text-sm text-jade-ink-soft transition-opacity hover:opacity-70">
        실종자들의 정원에서 자세히 보기
      </Link>
    </section>
  );
}
