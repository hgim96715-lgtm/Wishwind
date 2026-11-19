import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm, Button } from "@/components/admin/ActionForm";
import { Empty, ErrorBox, FilterTabs, PageTitle, Skeleton, inputClass } from "@/components/admin/ui";
import { createCaseFromNews, dismissAllNews, setNewsStatus, syncNews, translateNews } from "@/app/admin/actions";
import { CATEGORY_LABEL } from "@/lib/cases/labels";
import type { CaseCategory } from "@/lib/cases/types";
import { formatDateTime } from "@/lib/admin/labels";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { AdminCaseList, NewsItem, NewsStatus } from "@/lib/admin/types";

export const metadata: Metadata = { title: "새 뉴스 확인" };

const TABS: { key: NewsStatus; label: string }[] = [
  { key: "NEW", label: "확인 전" },
  { key: "PUBLISHED", label: "브리핑룸에 공개" },
  { key: "DISMISSED", label: "숨김" },
];

export default function NewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <PageTitle
        title="새 뉴스 확인"
        description="Google 뉴스에서 사건·실종 기사의 제목과 링크를 몇 시간마다 모읍니다. 공개를 누른 기사만 브리핑룸 ‘새 소식’에 보입니다. 사건에 연결하면 그 사건의 출처와 타임라인에 기사가 한 줄 추가되고, 사건방에 없는 새 사건은 ‘수사 중’ 초안으로 만들 수 있습니다."
      />
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <ActionForm action={syncNews}>
          <Button>지금 새로 가져오기</Button>
        </ActionForm>
        <ActionForm action={dismissAllNews} confirmMessage="확인 전인 기사를 모두 숨길까요?">
          <Button tone="danger">확인 전 기사 모두 숨기기</Button>
        </ActionForm>
      </div>
      <Suspense fallback={<Skeleton />}>
        {searchParams.then((sp) => {
          const status = (TABS.find((t) => t.key === sp.status)?.key ?? "NEW") as NewsStatus;
          const scope = sp.scope === "foreign" ? "foreign" : "kr";
          return (
            <>
              <FilterTabs
                current={scope}
                items={[
                  { key: "kr", label: "🇰🇷 국내", href: `/admin/news?scope=kr&status=${status}` },
                  { key: "foreign", label: "🌐 해외 (미국·영국·일본)", href: `/admin/news?scope=foreign&status=${status}` },
                ]}
              />
              <Suspense key={`${scope}-${status}`} fallback={<Skeleton />}>
                <NewsList status={status} scope={scope} />
              </Suspense>
            </>
          );
        })}
      </Suspense>
    </>
  );
}

const FLAG: Record<NewsItem["region"], string> = { KR: "🇰🇷", US: "🇺🇸", GB: "🇬🇧", JP: "🇯🇵" };

type NewsListResponse = { items: NewsItem[]; counts: Partial<Record<NewsStatus, number>>; papago: boolean };

async function NewsList({ status, scope }: { status: NewsStatus; scope: "kr" | "foreign" }) {
  let data: NewsListResponse;
  let cases: AdminCaseList;
  try {
    [data, cases] = await Promise.all([
      adminGet<NewsListResponse>(`/news?status=${status}&scope=${scope}`),
      adminGet<AdminCaseList>("/cases"),
    ]);
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  return (
    <>
      <FilterTabs
        current={status}
        items={TABS.map((t) => ({ ...t, href: `/admin/news?scope=${scope}&status=${t.key}`, count: data.counts[t.key] ?? 0 }))}
      />
      {scope === "foreign" && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-xs text-subtle">
            {data.papago
              ? "새 기사를 모을 때 제목을 Papago로 한국어 번역해 둡니다. 번역이 어색하면 한국어 제목 칸을 고쳐서 공개하세요."
              : "Papago 키(PAPAGO_CLIENT_ID·SECRET)가 없어 제목을 번역하지 못합니다. apps/api/.env에 키를 넣고 API를 다시 시작하면 다음 수집부터 한국어 제목으로 보입니다."}
          </p>
          {data.papago && status === "NEW" && (
            <ActionForm inline action={translateNews}>
              <Button>번역 안 된 제목 번역하기</Button>
            </ActionForm>
          )}
        </div>
      )}
      {data.items.length === 0 ? (
        <Empty>{status === "NEW" ? "확인할 새 기사가 없습니다. 몇 시간마다 자동으로 모입니다." : "기사가 없습니다."}</Empty>
      ) : (
        <ul className="space-y-2">
          {data.items.map((n) => (
            <li key={n.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{FLAG[n.region]}</span>
                <span className="font-medium text-foreground">{n.publisher}</span>
                <span>· {formatDateTime(n.publishedAt)}</span>
                <span className="text-subtle">· 검색어 “{n.query}”</span>
                {n.case && <span>· 연결: {n.case.title}</span>}
              </div>
              <a href={n.url} target="_blank" rel="noreferrer noopener" className="mt-1 block font-medium hover:underline">
                {n.titleKo ?? n.title} ↗
              </a>
              {n.titleKo && <p className="text-xs text-subtle">원문: {n.title}</p>}
              {n.suggestions.length > 0 && (
                <p className="mt-2 text-xs text-[#b0832f]">
                  이 사건 소식일 수 있습니다: {n.suggestions.map((c) => c.title).join(", ")}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {n.status !== "PUBLISHED" && (
                  <ActionForm inline action={setNewsStatus.bind(null, n.id, "PUBLISHED")} className="flex flex-wrap items-center gap-2">
                    {n.lang !== "ko" && (
                      <input
                        name="titleKo"
                        defaultValue={n.titleKo ?? ""}
                        maxLength={300}
                        placeholder="한국어 제목 (선택)"
                        className={`${inputClass} w-72 py-1.5`}
                      />
                    )}
                    <CaseSelect item={n} cases={cases} />
                    <input
                      name="timelineTitle"
                      maxLength={200}
                      placeholder="타임라인 제목 (비우면 기사 제목)"
                      className={`${inputClass} w-64 py-1.5`}
                    />
                    <Button tone="ok">브리핑룸에 공개</Button>
                  </ActionForm>
                )}
                {n.status !== "DISMISSED" && (
                  <ActionForm inline action={setNewsStatus.bind(null, n.id, "DISMISSED")}>
                    <Button>숨기기</Button>
                  </ActionForm>
                )}
                {n.status !== "NEW" && (
                  <ActionForm inline action={setNewsStatus.bind(null, n.id, "NEW")}>
                    <Button>확인 전으로</Button>
                  </ActionForm>
                )}
              </div>
              {!n.caseId && <NewCaseForm item={n} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** 제목이 비슷한 사건을 맨 위에 두고 나머지 사건을 이어서 보여 줌. 초안 사건도 연결할 수 있음 */
function CaseSelect({ item, cases }: { item: NewsItem; cases: AdminCaseList }) {
  const suggested = new Set(item.suggestions.map((c) => c.id));
  const rest = cases.items.filter((c) => !suggested.has(c.id));
  return (
    <select
      name="caseId"
      defaultValue={item.caseId ?? ""}
      className={`${inputClass} w-auto max-w-64 py-1.5`}
    >
      <option value="">사건 연결 안 함</option>
      {item.suggestions.length > 0 && (
        <optgroup label="비슷한 사건">
          {item.suggestions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
              {c.isPublished ? "" : " (초안)"}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="모든 사건">
        {rest.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
            {c.isPublished ? "" : " (초안)"}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

const CATEGORIES = Object.entries(CATEGORY_LABEL) as [CaseCategory, string][];

/** 사건방에 아직 없는 사건이면 이 기사로 '수사 중' 초안을 만듦 */
function NewCaseForm({ item }: { item: NewsItem }) {
  return (
    <details className="mt-3 rounded-md border border-dashed border-line p-3">
      <summary className="cursor-pointer text-sm font-medium text-muted">이 기사로 새 사건 만들기 (수사 중)</summary>
      <ActionForm action={createCaseFromNews.bind(null, item.id)} className="mt-3 space-y-2">
        <input
          name="title"
          required
          minLength={2}
          maxLength={200}
          placeholder="사건 이름 (예: 강남 학원 원장 초등생 성폭행 사건)"
          className={inputClass}
        />
        <textarea
          name="summary"
          required
          minLength={10}
          maxLength={500}
          rows={3}
          placeholder="한두 문장 요약. 확정 전이라 단정하지 말고 ‘~한 혐의로 수사 중입니다’처럼 써 주세요."
          className={inputClass}
        />
        <div className="flex flex-wrap gap-2">
          <select name="category" defaultValue="MURDER" className={`${inputClass} w-auto py-1.5`}>
            {CATEGORIES.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input name="location" maxLength={200} placeholder="지역 (선택)" className={`${inputClass} w-48 py-1.5`} />
          <input
            name="timelineTitle"
            maxLength={200}
            placeholder="첫 타임라인 제목 (비우면 기사 제목)"
            className={`${inputClass} w-64 py-1.5`}
          />
        </div>
        <p className="text-xs text-subtle">
          비공개 초안으로 만들어지고 이 기사가 첫 출처가 됩니다. 공개하려면 출처가 2곳 이상 필요하니, 후속 기사를 이 사건에 연결해 주세요.
        </p>
        <Button tone="ok">사건 초안 만들기</Button>
      </ActionForm>
    </details>
  );
}
