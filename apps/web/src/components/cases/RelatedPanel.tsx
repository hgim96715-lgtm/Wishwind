import type { IconType } from "react-icons";
import {
  LuBookOpen,
  LuClapperboard,
  LuExternalLink,
  LuFilm,
  LuLandmark,
  LuMic,
  LuMonitorPlay,
  LuNewspaper,
  LuTv,
  LuYoutube,
} from "react-icons/lu";
import { formatCaseDate } from "@/lib/cases/labels";
import type { CaseDetail, RelatedContent, RelatedKind, SourceType } from "@/lib/cases/types";

const KIND: Record<RelatedKind, { label: string; icon: IconType }> = {
  DOCUMENTARY: { label: "다큐멘터리", icon: LuClapperboard },
  TV_PROGRAM: { label: "방송", icon: LuTv },
  YOUTUBE: { label: "유튜브", icon: LuYoutube },
  PODCAST: { label: "팟캐스트", icon: LuMic },
  MOVIE: { label: "영화", icon: LuFilm },
  SERIES: { label: "시리즈", icon: LuMonitorPlay },
  BOOK: { label: "책", icon: LuBookOpen },
};

/** 화면에서 묶는 순서: 사실을 다룬 것 → 각색 작품 → 책 */
const GROUPS: { title: string; kinds: RelatedKind[] }[] = [
  { title: "다큐·방송·영상", kinds: ["DOCUMENTARY", "TV_PROGRAM", "YOUTUBE", "PODCAST"] },
  { title: "영화·시리즈", kinds: ["MOVIE", "SERIES"] },
  { title: "책", kinds: ["BOOK"] },
];

const OFFICIAL: SourceType[] = ["COURT", "GOVERNMENT"];

/**
 * 관련 콘텐츠 탭: 다큐·영화·유튜브(관리자가 등록) + 뉴스(연결된 소식, 사건 정리에 쓴 기사) + 공식 자료.
 * 모두 바깥 링크라 새 탭으로 열고, 사이트 안에 영상을 붙이지 않음 (저작권·용량)
 */
export function RelatedPanel({ data }: { data: CaseDetail }) {
  const related = data.relatedContents ?? [];
  const sources = data.sources ?? [];
  const newsUrls = new Set((data.newsItems ?? []).map((n) => n.url));
  const articles = sources.filter((s) => !OFFICIAL.includes(s.type) && !newsUrls.has(s.url));
  const official = sources.filter((s) => OFFICIAL.includes(s.type));
  const news = data.newsItems ?? [];

  if (related.length + sources.length + news.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-subtle">
        아직 모아 둔 콘텐츠가 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {GROUPS.map(({ title, kinds }) => {
        const items = related.filter((r) => kinds.includes(r.kind));
        if (items.length === 0) return null;
        return (
          <Section key={title} title={title}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <li key={item.id}>
                  <ContentCard item={item} />
                </li>
              ))}
            </ul>
          </Section>
        );
      })}

      {news.length + articles.length > 0 && (
        <Section title="뉴스">
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {news.map((n) => (
              <LinkRow
                key={n.id}
                href={n.url}
                icon={LuNewspaper}
                title={n.titleKo ?? n.title}
                meta={[n.publisher, n.publishedAt && formatCaseDate(n.publishedAt, "DAY", "Asia/Seoul")]}
                badge="새 소식"
              />
            ))}
            {articles.map((s) => (
              <LinkRow
                key={s.id}
                href={s.url}
                icon={LuNewspaper}
                title={s.title}
                meta={[s.publisher, s.publishedAt && formatCaseDate(s.publishedAt, "DAY")]}
              />
            ))}
          </ul>
        </Section>
      )}

      {official.length > 0 && (
        <Section title="판결·공식 자료">
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {official.map((s) => (
              <LinkRow
                key={s.id}
                href={s.url}
                icon={LuLandmark}
                title={s.title}
                meta={[s.publisher, s.publishedAt && formatCaseDate(s.publishedAt, "DAY")]}
              />
            ))}
          </ul>
        </Section>
      )}

      <p className="text-xs leading-5 text-subtle">
        바깥 사이트로 연결됩니다. 영화·시리즈 중 각색 작품은 실제 사건과 다른 내용이 들어 있을 수 있습니다.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-3 text-sm font-semibold text-muted">{title}</h3>
      {children}
    </section>
  );
}

function ContentCard({ item }: { item: RelatedContent }) {
  const { label, icon: Icon } = KIND[item.kind];
  const year = item.releaseYear;
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex h-full gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-[#c46a4b]/40"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#c46a4b]/10 text-[#c46a4b]">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-subtle">
          <span>{label}</span>
          <span aria-hidden>·</span>
          <span>{item.platform}</span>
          {year && (
            <>
              <span aria-hidden>·</span>
              <span>{year}</span>
            </>
          )}
          {item.isDramatized && (
            <span className="rounded border border-line px-1.5 py-px text-[11px]">각색</span>
          )}
        </span>
        <span className="mt-1 block font-semibold leading-snug group-hover:underline">{item.title}</span>
        {item.creator && <span className="mt-0.5 block text-xs text-subtle">{item.creator}</span>}
        {item.note && <span className="mt-1.5 block text-sm leading-6 text-muted">{item.note}</span>}
      </span>
      <LuExternalLink aria-hidden className="mt-1 size-4 shrink-0 text-subtle" />
    </a>
  );
}

function LinkRow({
  href,
  icon: Icon,
  title,
  meta,
  badge,
}: {
  href: string;
  icon: IconType;
  title: string;
  meta: (string | null | false | undefined)[];
  badge?: string;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-background"
      >
        <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-subtle" />
        <span className="min-w-0 flex-1">
          <span className="leading-6">
            {badge && (
              <span className="mr-1.5 rounded bg-[#c46a4b]/10 px-1.5 py-px text-[11px] font-medium text-[#c46a4b]">
                {badge}
              </span>
            )}
            {title}
          </span>
          <span className="block text-xs text-subtle">{meta.filter(Boolean).join(" · ")}</span>
        </span>
      </a>
    </li>
  );
}
