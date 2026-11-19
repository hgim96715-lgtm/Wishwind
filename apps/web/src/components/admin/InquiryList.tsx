import Link from "next/link";
import { ActionForm, Button } from "@/components/admin/ActionForm";
import { Badge, Empty, ErrorBox, FilterTabs, inputClass } from "@/components/admin/ui";
import { replyInquiry, setInquiryStatus } from "@/app/admin/actions";
import { INQUIRY_KIND_LABEL, INQUIRY_STATUS_LABEL, formatDateTime, shortId } from "@/lib/admin/labels";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { Inquiry, InquiryStatus } from "@/lib/admin/types";

const STATUSES: InquiryStatus[] = ["OPEN", "ANSWERED", "CLOSED"];
const STATUS_COLOR: Record<InquiryStatus, string> = { OPEN: "#c46a4b", ANSWERED: "#3f8f84", CLOSED: "#9a9389" };

export async function InquiryList({
  group,
  status,
  basePath,
}: {
  group: "inquiry" | "feedback";
  status: string;
  basePath: string;
}) {
  let data: { items: Inquiry[]; counts: Partial<Record<InquiryStatus, number>> };
  try {
    data = await adminGet(`/inquiries?${new URLSearchParams({ group, ...(status && { status }) })}`);
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  const total = Object.values(data.counts).reduce((n, c) => n + (c ?? 0), 0);
  const feedback = group === "feedback";
  return (
    <>
      <FilterTabs
        current={status}
        items={[
          { key: "", label: "전체", href: basePath, count: total },
          ...STATUSES.map((s) => ({
            key: s,
            label: feedback && s === "OPEN" ? "새 의견" : feedback && s === "CLOSED" ? "읽음" : INQUIRY_STATUS_LABEL[s],
            href: `${basePath}?status=${s}`,
            count: data.counts[s] ?? 0,
          })),
        ]}
      />
      {data.items.length === 0 ? (
        <Empty>{feedback ? "아직 들어온 의견이 없습니다." : "아직 들어온 문의가 없습니다."}</Empty>
      ) : (
        <ul className="space-y-3">
          {data.items.map((q) => (
            <li key={q.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <Badge color={STATUS_COLOR[q.status]}>{INQUIRY_STATUS_LABEL[q.status]}</Badge>
                <span>{INQUIRY_KIND_LABEL[q.kind]}</span>
                {q.caseSlug && (
                  <Link href={`/cases/${q.caseSlug}`} className="hover:underline">
                    · {q.caseSlug}
                  </Link>
                )}
                <Link href={`/admin/moderation/voters/${q.voterId}`} className="underline">
                  보낸 사람 #{shortId(q.voterId)}
                </Link>
                <span className="ml-auto">{formatDateTime(q.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words">{q.body}</p>

              {!feedback && (
                <ActionForm action={replyInquiry.bind(null, q.id)} className="mt-3">
                  <textarea
                    name="reply"
                    defaultValue={q.reply ?? ""}
                    rows={3}
                    required
                    placeholder="답변은 보낸 사람이 ‘문의하기’ 페이지에서 볼 수 있습니다."
                    className={inputClass}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button tone="primary">{q.reply ? "답변 고치기" : "답변 남기기"}</Button>
                    {q.repliedAt && <span className="text-xs text-subtle">답변 {formatDateTime(q.repliedAt)}</span>}
                  </div>
                </ActionForm>
              )}
              <div className="mt-2 flex gap-2">
                {q.status !== "CLOSED" && (
                  <ActionForm inline action={setInquiryStatus.bind(null, q.id, "CLOSED")}>
                    <Button>{feedback ? "읽음으로 표시" : "닫기"}</Button>
                  </ActionForm>
                )}
                {q.status === "CLOSED" && (
                  <ActionForm inline action={setInquiryStatus.bind(null, q.id, "OPEN")}>
                    <Button>다시 열기</Button>
                  </ActionForm>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
