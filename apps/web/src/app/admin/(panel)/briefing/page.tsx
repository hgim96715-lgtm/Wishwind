import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Button } from "@/components/admin/ActionForm";
import { Badge, Card, Empty, ErrorBox, FilterTabs, PageTitle, Skeleton, inputClass } from "@/components/admin/ui";
import { draftOpinionSummary } from "@/app/admin/actions";
import { BRIEFING_KIND_LABEL, BRIEFING_STATUS_LABEL, formatDateTime } from "@/lib/admin/labels";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { AdminCaseList, BriefingKind, BriefingPost } from "@/lib/admin/types";

export const metadata: Metadata = { title: "브리핑 글·공지" };

const KINDS = Object.keys(BRIEFING_KIND_LABEL) as BriefingKind[];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function BriefingAdminPage({ searchParams }: PageProps<"/admin/briefing">) {
  return (
    <>
      <PageTitle
        title="브리핑 글·공지"
        description="브리핑룸에 올라가는 공지사항, 새 소식, 사건 변경, 의견 요약을 씁니다. 초안은 사이트에 보이지 않습니다."
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/admin/briefing/new" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-surface">
          새 글 쓰기
        </Link>
      </div>
      <Suspense fallback={<Skeleton />}>
        {searchParams.then((sp) => (
          <PostList kind={one(sp.kind)} status={one(sp.status)} />
        ))}
      </Suspense>
    </>
  );
}

async function PostList({ kind, status }: { kind: string; status: string }) {
  const qs = new URLSearchParams();
  if (kind) qs.set("kind", kind);
  if (status) qs.set("status", status);
  let posts: BriefingPost[];
  let cases: AdminCaseList;
  try {
    [posts, cases] = await Promise.all([
      adminGet<BriefingPost[]>(`/briefing?${qs}`),
      adminGet<AdminCaseList>("/cases?published=true"),
    ]);
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  const link = (k: string) => `/admin/briefing?${new URLSearchParams({ ...(k && { kind: k }), ...(status && { status }) })}`;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <FilterTabs
          current={kind}
          items={[{ key: "", label: "전체", href: link("") }, ...KINDS.map((k) => ({ key: k, label: BRIEFING_KIND_LABEL[k], href: link(k) }))]}
        />
        {posts.length === 0 ? (
          <Empty>글이 없습니다.</Empty>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {posts.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Badge color={p.status === "PUBLISHED" ? "#3f8f84" : "#9a9389"}>{BRIEFING_STATUS_LABEL[p.status]}</Badge>
                  <span>{BRIEFING_KIND_LABEL[p.kind]}</span>
                  {p.isPinned && <span>📌 고정</span>}
                  {p.case && <span>· {p.case.title}</span>}
                  <span className="ml-auto">{formatDateTime(p.publishedAt ?? p.createdAt)}</span>
                </div>
                <Link href={`/admin/briefing/${p.id}`} className="mt-1 block font-medium transition-opacity hover:opacity-70">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Card className="h-fit">
        <h2 className="text-sm font-semibold">의견 요약 초안 만들기</h2>
        <p className="mt-1 mb-3 text-xs text-muted">
          공개된 수사 노트 답변·질문·형량 의견을 AI가 읽고 요약 초안을 씁니다. 확인하고 고친 뒤 공개합니다.
          ANTHROPIC_API_KEY가 있어야 합니다.
        </p>
        <ActionForm action={draftOpinionSummary}>
          <select name="caseId" required className={inputClass} defaultValue="">
            <option value="" disabled>
              사건 고르기
            </option>
            {cases.items.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <Button>초안 만들기</Button>
        </ActionForm>
      </Card>
    </div>
  );
}
