import Link from "next/link";
import { LuPin } from "react-icons/lu";
import { getBriefing, type Briefing, type BriefingKind, type BriefingPost } from "@/lib/briefing/api";
import { ApiUnavailableError } from "@/lib/cases/api";
import { CATEGORY_COLOR, CATEGORY_LABEL, COUNTRY_LABEL, SENTENCE_TYPE_LABEL, STATUS_STAMP } from "@/lib/cases/labels";
import type { SentenceType } from "@/lib/cases/types";

const KIND: Record<BriefingKind, { label: string; color: string; tab: string }> = {
  NOTICE: { label: "공지", color: "#4f78a8", tab: "NOTICE" },
  NEWS: { label: "새 소식", color: "#3f8f84", tab: "NEWS" },
  CASE_UPDATE: { label: "사건 변경", color: "#c46a4b", tab: "UPDATE" },
  OPINION: { label: "사람들의 생각", color: "#8a5f8f", tab: "VOICES" },
};

const dateFmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const formatDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "");
const penaltyLabel = (p: string) => SENTENCE_TYPE_LABEL[p as SentenceType] ?? p;

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
      <RecentCases cases={data.recentCases} />
      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <section aria-labelledby="feed-title">
          <h2 id="feed-title" className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-subtle">
            Today&apos;s Briefing
          </h2>
          {data.news.length > 0 && <NewsList news={data.news} />}
          {data.posts.length === 0 ? (
            data.news.length === 0 && (
              <p className="rounded-xl border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
                아직 올라온 브리핑이 없습니다. 새 소식이 생기면 이곳에 정리해 두겠습니다.
              </p>
            )
          ) : (
            <ul className="space-y-4">
              {data.posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </ul>
          )}
          <Voices opinions={data.opinions} participation={data.participation} />
        </section>
        <aside className="space-y-8">
          <CaseStats stats={data.stats} />
          <NewMissing missing={data.missing} />
        </aside>
      </div>
    </div>
  );
}

const relFmt = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
function ago(iso: string | null) {
  if (!iso) return "";
  const hours = Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
  return Math.abs(hours) < 24 ? relFmt.format(hours, "hour") : relFmt.format(Math.round(hours / 24), "day");
}

const REGION_FLAG = { KR: "🇰🇷", US: "🇺🇸", GB: "🇬🇧", JP: "🇯🇵" } as const;

/** 기사 본문은 옮기지 않고 제목·언론사·원문 링크만 보여 줌 */
function NewsList({ news }: { news: Briefing["news"] }) {
  return (
    <div className="mb-6 rounded-xl border border-line bg-surface p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="font-mono text-xs tracking-wider text-[#3f8f84]">NEWS</span>새 소식
      </h3>
      <ul className="mt-3 divide-y divide-line/70">
        {news.map((n) => (
          <li key={n.id} className="py-2.5">
            <a href={n.url} target="_blank" rel="noreferrer noopener" className="font-medium leading-snug hover:underline">
              {n.region !== "KR" && <span className="mr-1">{REGION_FLAG[n.region]}</span>}
              {n.titleKo ?? n.title}
            </a>
            {n.titleKo && n.region !== "KR" && <p className="mt-0.5 text-xs text-subtle">{n.title}</p>}
            <p className="mt-0.5 text-xs text-subtle">
              {n.publisher} · {ago(n.publishedAt)}
              {n.case && (
                <>
                  {" · "}
                  <Link href={`/cases/${n.case.slug}`} className="text-[#c46a4b] hover:underline">
                    {n.case.title} 사건 파일
                  </Link>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-subtle">기사 내용은 각 언론사 원문에서 확인해 주세요.</p>
    </div>
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
        <Link href="/cases" className="text-sm text-[#c46a4b] hover:underline">
          사건방 전체 보기 →
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
                  style={{ color: STATUS_STAMP[c.status].color, borderColor: `${STATUS_STAMP[c.status].color}55` }}
                >
                  {STATUS_STAMP[c.status].label}
                </span>
                <span className="ml-auto text-subtle">{COUNTRY_LABEL[c.country]}</span>
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
    <section aria-label="공지사항" className="rounded-xl border border-[#4f78a8]/30 bg-[#4f78a8]/5 p-5">
      <ul className="space-y-3">
        {notices.map((n) => (
          <li key={n.id}>
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-2">
                {n.isPinned ? <LuPin aria-label="고정" className="size-4 text-[#4f78a8]" /> : <span className="text-[#4f78a8]">•</span>}
                <span className="text-xs font-semibold text-[#4f78a8]">공지</span>
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
    <li className="relative overflow-hidden rounded-xl border border-line bg-surface p-5 pl-6 shadow-[0_1px_0_rgb(47_44_40/0.04)]">
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
        <Link href={`/cases/${post.case.slug}`} className="mt-3 inline-block text-sm text-[#c46a4b] hover:underline">
          📁 {post.case.title} 사건 파일 보기
        </Link>
      )}
    </li>
  );
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
        {stats.byStatus.map((s) => (
          <span
            key={s.key}
            className="rounded-full border px-2.5 py-0.5 text-xs"
            style={{ color: STATUS_STAMP[s.key].color, borderColor: `${STATUS_STAMP[s.key].color}55` }}
          >
            {STATUS_STAMP[s.key].label} {s.count}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-subtle">
        {stats.byCountry.map((c) => `${COUNTRY_LABEL[c.key]} ${c.count}`).join(" · ")}
      </p>
    </section>
  );
}

function NewMissing({ missing }: { missing: Briefing["missing"] }) {
  if (missing.length === 0) return null;
  return (
    <section aria-labelledby="missing-title" className="rounded-xl border border-line bg-surface p-5">
      <h2 id="missing-title" className="font-semibold">새로 등록된 실종자</h2>
      <p className="mt-1 text-xs text-subtle">FBI·경찰청 공개 정보를 바탕으로 합니다.</p>
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
      <Link href="/missing" className="mt-4 inline-block text-sm text-[#3f8f84] hover:underline">
        실종방에서 자세히 보기 →
      </Link>
    </section>
  );
}

function Voices({
  opinions,
  participation,
}: {
  opinions: Briefing["opinions"];
  participation: Briefing["participation"];
}) {
  const empty =
    opinions.sentenceVotes.length + opinions.curious.length + opinions.mostAnswered.length === 0;
  return (
    <section aria-labelledby="voices-title" className="mt-12">
      <h2 id="voices-title" className="font-mono text-xs uppercase tracking-[0.2em] text-subtle">
        Investigation Notes
      </h2>
      <p className="mt-2 text-lg font-semibold">사람들은 이렇게 생각했습니다</p>
      <p className="mt-1 text-sm text-muted">
        지금까지 수사 노트 {participation.answers + participation.questions}개, 형량 의견 {participation.votes}개, 실종방 응원{" "}
        {participation.clouds}개가 모였습니다.
      </p>
      {empty ? (
        <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          아직 모인 의견이 많지 않습니다. 사건방에서 첫 수사 노트를 남겨 주세요.
        </p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {opinions.sentenceVotes.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-5 sm:col-span-2">
              <h3 className="text-sm font-semibold">의견이 많이 모인 형량</h3>
              <ul className="mt-3 space-y-4">
                {opinions.sentenceVotes.map((v) => {
                  const total = v.agree + v.disagree;
                  const pct = total ? Math.round((v.agree / total) * 100) : 0;
                  return (
                    <li key={v.sentenceId} className="text-sm">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link href={`/cases/${v.caseSlug}`} className="font-medium hover:underline">
                          {v.caseTitle}
                        </Link>
                        <span className="text-xs text-muted">
                          {penaltyLabel(v.penalty)} · {total}명
                        </span>
                      </div>
                      <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-[#c46a4b]/30" aria-hidden>
                        <div className="bg-[#3f8f84]" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        적절하다 {pct}% · 아니다 {100 - pct}%
                        {v.disagree > 0 && ` (너무 가볍다 ${v.tooLenient}, 너무 무겁다 ${v.tooHarsh})`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {opinions.curious.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-5">
              <h3 className="text-sm font-semibold">함께 궁금해한 질문</h3>
              <ul className="mt-3 space-y-3 text-sm">
                {opinions.curious.map((q) => (
                  <li key={q.id}>
                    <p>“{q.body}”</p>
                    <Link href={`/cases/${q.case.slug}`} className="text-xs text-muted hover:underline">
                      {q.case.title} · 나도 궁금해요 {q.curiousCount}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {opinions.mostAnswered.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-5">
              <h3 className="text-sm font-semibold">답이 많이 달린 생각해볼 점</h3>
              <ul className="mt-3 space-y-3 text-sm">
                {opinions.mostAnswered.map((q) => (
                  <li key={q.id}>
                    <p>{q.question}</p>
                    <Link href={`/cases/${q.caseSlug}`} className="text-xs text-muted hover:underline">
                      {q.caseTitle} · 답변 {q.answers}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
