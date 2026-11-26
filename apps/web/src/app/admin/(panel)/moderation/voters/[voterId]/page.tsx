import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Button } from "@/components/admin/ActionForm";
import { Badge, Card, ErrorBox, Field, Skeleton, inputClass } from "@/components/admin/ui";
import { blockVoter, moderate, unblockVoter } from "@/app/admin/actions";
import {
  CONTENT_STATUS_COLOR,
  CONTENT_STATUS_LABEL,
  CONTENT_TYPE_LABEL,
  formatDateTime,
  shortId,
} from "@/lib/admin/labels";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { VoterDetail, VoterPost } from "@/lib/admin/types";

export default function VoterPage({ params }: PageProps<"/admin/moderation/voters/[voterId]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      {params.then(({ voterId }) => (
        <Voter voterId={voterId} />
      ))}
    </Suspense>
  );
}

async function Voter({ voterId }: { voterId: string }) {
  let v: VoterDetail;
  try {
    v = await adminGet<VoterDetail>(`/voters/${encodeURIComponent(voterId)}`);
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  const groups = [
    { type: "answer" as const, posts: v.answers },
    { type: "question" as const, posts: v.questions },
    { type: "cloud" as const, posts: v.clouds },
  ];
  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/moderation" className="text-sm text-subtle hover:text-foreground">
          부적절한 글
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">작성자 #{shortId(v.voterId)}</h1>
        <p className="mt-1 font-mono text-xs text-subtle">{v.voterId}</p>
        <p className="mt-2 text-sm text-muted">
          글 {v.summary.total}개 · 공개 {v.summary.byStatus.PUBLISHED} · 보류 {v.summary.byStatus.HELD} · 차단{" "}
          {v.summary.byStatus.BLOCKED} · 숨김 {v.summary.byStatus.HIDDEN} · 받은 신고 {v.summary.reports} · 문의 {v.inquiries}
        </p>
      </header>

      <Card>
        {v.blocked ? (
          <ActionForm action={unblockVoter.bind(null, v.voterId)}>
            <p className="text-sm">
              <Badge color="#c46a4b">참여 제한됨</Badge>{" "}
              <span className="text-muted">
                {formatDateTime(v.blocked.createdAt)}
                {v.blocked.reason && ` · ${v.blocked.reason}`}
              </span>
            </p>
            <Button>제한 풀기</Button>
            <p className="text-xs text-subtle">제한을 풀어도 숨긴 글은 그대로 숨김 상태입니다.</p>
          </ActionForm>
        ) : (
          <ActionForm
            action={blockVoter.bind(null, v.voterId)}
            confirmMessage="이 사람의 참여를 제한하고 공개된 글을 모두 숨길까요?"
          >
            <Field label="참여 제한 사유 (관리자만 봄)">
              <input name="reason" maxLength={300} className={inputClass} placeholder="예: 피해자 비하 반복" />
            </Field>
            <Button tone="danger">참여 제한하기</Button>
            <p className="text-xs text-subtle">
              이 브라우저에서 수사 노트·질문·응원·문의를 더 남길 수 없게 되고, 이미 공개된 글은 모두 숨겨집니다. 익명 ID라
              브라우저를 바꾸면 피할 수 있습니다.
            </p>
          </ActionForm>
        )}
      </Card>

      {groups.map(({ type, posts }) =>
        posts.length === 0 ? null : (
          <section key={type}>
            <h2 className="mb-2 text-sm font-semibold">
              {CONTENT_TYPE_LABEL[type]} {posts.length}
            </h2>
            <ul className="space-y-2">
              {posts.map((p) => (
                <PostRow key={p.id} type={type} post={p} />
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}

function PostRow({ type, post }: { type: "answer" | "question" | "cloud"; post: VoterPost }) {
  return (
    <li className="rounded-lg border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge color={CONTENT_STATUS_COLOR[post.status]}>{CONTENT_STATUS_LABEL[post.status]}</Badge>
        <span>{post.context}</span>
        {post.reportCount > 0 && <span className="text-clay-ink">신고 {post.reportCount}</span>}
        <span className="ml-auto">{formatDateTime(post.at)}</span>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm">{post.body}</p>
      <div className="mt-2 flex gap-2">
        {post.status !== "PUBLISHED" && (
          <ActionForm inline action={moderate.bind(null, type, post.id, "publish")}>
            <Button tone="ok">공개</Button>
          </ActionForm>
        )}
        {post.status !== "HIDDEN" && (
          <ActionForm inline action={moderate.bind(null, type, post.id, "hide")}>
            <Button>숨김</Button>
          </ActionForm>
        )}
      </div>
    </li>
  );
}
