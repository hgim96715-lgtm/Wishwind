import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Button } from "@/components/admin/ActionForm";
import { Badge, Empty, ErrorBox, FilterTabs, PageTitle, Skeleton } from "@/components/admin/ui";
import { moderate } from "@/app/admin/actions";
import {
  CONTENT_STATUS_COLOR,
  CONTENT_STATUS_LABEL,
  CONTENT_TYPE_LABEL,
  MODERATION_CATEGORY_LABEL,
  formatDateTime,
  shortId,
} from "@/lib/admin/labels";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { ModerationItem } from "@/lib/admin/types";

export const metadata: Metadata = { title: "부적절한 글" };

const FILTERS = [
  { key: "held", label: "보류" },
  { key: "reported", label: "신고됨" },
  { key: "blocked", label: "차단" },
  { key: "hidden", label: "숨김" },
  { key: "all", label: "전체" },
  { key: "voters", label: "참여 제한한 사람" },
] as const;
const TYPES = [
  { key: "all", label: "모든 글" },
  { key: "answer", label: "수사 노트 답변" },
  { key: "question", label: "사용자 질문" },
  { key: "cloud", label: "실종방 응원" },
] as const;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default function ModerationPage({ searchParams }: PageProps<"/admin/moderation">) {
  return (
    <>
      <PageTitle
        title="부적절한 글"
        description="AI 검사에서 보류·차단된 글과 신고된 글을 확인합니다. 작성자는 이름이 아니라 브라우저별 익명 ID로 구분됩니다."
      />
      <Suspense fallback={<Skeleton />}>
        {searchParams.then((sp) => {
          const filter = one(sp.filter) || "held";
          const type = one(sp.type) || "all";
          return (
            <>
              <FilterTabs
                current={filter}
                items={FILTERS.map((f) => ({ ...f, href: `/admin/moderation?filter=${f.key}&type=${type}` }))}
              />
              {filter !== "voters" && <FilterTabs
                current={type}
                items={TYPES.map((t) => ({ ...t, href: `/admin/moderation?filter=${filter}&type=${t.key}` }))}
              />}
              <Suspense key={`${filter}-${type}`} fallback={<Skeleton />}>
                {filter === "voters" ? <BlockedVoters /> : <ModerationList filter={filter} type={type} />}
              </Suspense>
            </>
          );
        })}
      </Suspense>
    </>
  );
}

async function BlockedVoters() {
  let voters: { voterId: string; reason: string | null; createdAt: string }[];
  try {
    voters = await adminGet("/voters");
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  if (voters.length === 0) return <Empty>참여를 제한한 사람이 없습니다.</Empty>;
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {voters.map((v) => (
        <li key={v.voterId} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
          <Link href={`/admin/moderation/voters/${v.voterId}`} className="font-medium underline">
            작성자 #{shortId(v.voterId)}
          </Link>
          <span className="text-muted">{v.reason ?? "사유 없음"}</span>
          <span className="ml-auto text-xs text-subtle">{formatDateTime(v.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

async function ModerationList({ filter, type }: { filter: string; type: string }) {
  let items: ModerationItem[];
  try {
    ({ items } = await adminGet<{ items: ModerationItem[] }>(
      `/moderation?${new URLSearchParams({ filter, type })}`,
    ));
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  if (items.length === 0) return <Empty>확인할 글이 없습니다.</Empty>;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <ModerationRow key={`${item.type}-${item.id}`} item={item} />
      ))}
    </ul>
  );
}

function ModerationRow({ item }: { item: ModerationItem }) {
  const latest = item.moderations[0];
  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge color={CONTENT_STATUS_COLOR[item.status]}>{CONTENT_STATUS_LABEL[item.status]}</Badge>
        <span>{CONTENT_TYPE_LABEL[item.type]}</span>
        <span>·</span>
        {item.caseSlug ? (
          <Link href={`/cases/${item.caseSlug}`} className="hover:underline">
            {item.context}
          </Link>
        ) : (
          <span>{item.context}</span>
        )}
        <span className="ml-auto">{formatDateTime(item.at)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words">{item.body}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
        <Link href={`/admin/moderation/voters/${item.voterId}`} className="underline">
          작성자 #{shortId(item.voterId)}
        </Link>
        {item.voterBlocked && <Badge color="#c46a4b">참여 제한됨</Badge>}
        {latest && (
          <span>
            검사: {MODERATION_CATEGORY_LABEL[latest.category] ?? latest.category}
            {latest.reason && ` — ${latest.reason}`}
          </span>
        )}
        {item.reportCount > 0 && (
          <span className="text-[#b5543a]">
            신고 {item.reportCount}회 ·{" "}
            {item.reports.some((r) => r.reason)
              ? `사유: ${item.reports.flatMap((r) => (r.reason ? [r.reason] : [])).join(", ")}`
              : "사유 없음"}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.reportCount > 0 && item.type !== "cloud" && (
          <ActionForm
            inline
            action={moderate.bind(null, item.type, item.id, "dismiss")}
            confirmMessage="신고를 기각할까요? 신고 기록이 지워지고 글은 공개로 남습니다."
          >
            <Button tone="ok">신고 기각</Button>
          </ActionForm>
        )}
        {item.status !== "PUBLISHED" && (
          <ActionForm inline action={moderate.bind(null, item.type, item.id, "publish")}>
            <Button tone="ok">공개</Button>
          </ActionForm>
        )}
        {item.status !== "HIDDEN" && (
          <ActionForm inline action={moderate.bind(null, item.type, item.id, "hide")}>
            <Button>숨김</Button>
          </ActionForm>
        )}
        {item.status !== "BLOCKED" && (
          <ActionForm inline action={moderate.bind(null, item.type, item.id, "block")}>
            <Button tone="danger">차단</Button>
          </ActionForm>
        )}
      </div>
    </li>
  );
}
