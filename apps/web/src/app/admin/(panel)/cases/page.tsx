import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Empty, ErrorBox, FilterTabs, PageTitle, Skeleton, inputClass } from "@/components/admin/ui";
import { REVIEW_COLOR, REVIEW_LABEL, formatDateTime } from "@/lib/admin/labels";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { AdminCaseList, ReviewStatus } from "@/lib/admin/types";
import { CATEGORY_LABEL, COUNTRY_LABEL, caseRoomCountry, caseStamp } from "@/lib/cases/labels";

export const metadata: Metadata = { title: "사건 검토·수정" };

const REVIEWS: ReviewStatus[] = ["NEEDS_REVIEW", "DRAFT", "VERIFIED", "REJECTED"];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function AdminCasesPage({ searchParams }: PageProps<"/admin/cases">) {
  return (
    <>
      <PageTitle
        title="사건 검토·수정"
        description="검토 상태를 바꾸고 사건 내용을 고칩니다. 공개하려면 서로 다른 출처 2곳 이상이 필요합니다."
      />
      <Suspense fallback={<Skeleton />}>
        {searchParams.then((sp) => (
          <CaseTable q={one(sp.q)} review={one(sp.review)} published={one(sp.published)} />
        ))}
      </Suspense>
    </>
  );
}

async function CaseTable({ q, review, published }: { q: string; review: string; published: string }) {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (review) qs.set("review", review);
  if (published) qs.set("published", published);
  let data: AdminCaseList;
  try {
    data = await adminGet<AdminCaseList>(`/cases?${qs}`);
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  const count = (r: ReviewStatus) => data.counts.filter((c) => c.reviewStatus === r).reduce((n, c) => n + c.count, 0);
  const total = data.counts.reduce((n, c) => n + c.count, 0);
  const link = (r: string) => `/admin/cases?${new URLSearchParams({ ...(r && { review: r }), ...(q && { q }) })}`;

  return (
    <>
      <FilterTabs
        current={review}
        items={[
          { key: "", label: "전체", href: link(""), count: total },
          ...REVIEWS.map((r) => ({ key: r, label: REVIEW_LABEL[r], href: link(r), count: count(r) })),
        ]}
      />
      <form className="mb-4 flex flex-wrap gap-2">
        {review && <input type="hidden" name="review" value={review} />}
        <input name="q" defaultValue={q} placeholder="사건 제목이나 slug" className={`${inputClass} max-w-xs`} />
        <select name="published" defaultValue={published} className={`${inputClass} w-auto`}>
          <option value="">공개 여부 전체</option>
          <option value="true">공개 중</option>
          <option value="false">비공개</option>
        </select>
        <button className="rounded-md border border-line bg-surface px-3 text-sm">찾기</button>
      </form>

      {data.items.length === 0 ? (
        <Empty>조건에 맞는 사건이 없습니다.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">사건</th>
                <th className="px-3 py-2.5 font-medium">검토</th>
                <th className="px-3 py-2.5 font-medium">공개</th>
                <th className="px-3 py-2.5 font-medium">상태</th>
                <th className="px-3 py-2.5 font-medium">출처</th>
                <th className="px-3 py-2.5 font-medium">수정일</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} className="border-b border-line/60 last:border-0 hover:bg-background/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/cases/${c.id}`} className="font-medium transition-opacity hover:opacity-70">
                      {c.title}
                    </Link>
                    <p className="text-xs text-subtle">
                      {COUNTRY_LABEL[caseRoomCountry(c.country)]} · {CATEGORY_LABEL[c.category]} · {c.slug}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge color={REVIEW_COLOR[c.reviewStatus]}>{REVIEW_LABEL[c.reviewStatus]}</Badge>
                  </td>
                  <td className="px-3 py-2.5">{c.isPublished ? "공개" : <span className="text-subtle">비공개</span>}</td>
                  <td className="px-3 py-2.5">
                    <Badge color={caseStamp(c).color}>{caseStamp(c).label}</Badge>
                  </td>
                  <td className={`px-3 py-2.5 tabular-nums ${c.sourceCount < 2 ? "text-clay-ink" : ""}`}>{c.sourceCount}</td>
                  <td className="px-3 py-2.5 text-xs text-muted">{formatDateTime(c.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
