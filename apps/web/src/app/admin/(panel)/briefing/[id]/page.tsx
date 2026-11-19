import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Button } from "@/components/admin/ActionForm";
import { PostForm } from "@/components/admin/PostForm";
import { Badge, Card, ErrorBox, Skeleton } from "@/components/admin/ui";
import { deletePost, setPostStatus, updatePost } from "@/app/admin/actions";
import { BRIEFING_KIND_LABEL, BRIEFING_STATUS_LABEL, formatDateTime } from "@/lib/admin/labels";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { AdminCaseList, BriefingPost } from "@/lib/admin/types";

export default function EditPostPage({ params }: PageProps<"/admin/briefing/[id]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      {params.then(({ id }) => (
        <EditPost id={id} />
      ))}
    </Suspense>
  );
}

async function EditPost({ id }: { id: string }) {
  let post: BriefingPost;
  let cases: AdminCaseList;
  try {
    [post, cases] = await Promise.all([
      adminGet<BriefingPost>(`/briefing/${encodeURIComponent(id)}`),
      adminGet<AdminCaseList>("/cases"),
    ]);
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  const published = post.status === "PUBLISHED";
  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/briefing" className="text-sm text-subtle hover:text-foreground">
          ← 브리핑 글
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
          <Badge color={published ? "#3f8f84" : "#9a9389"}>{BRIEFING_STATUS_LABEL[post.status]}</Badge>
        </div>
        <p className="mt-1 text-xs text-subtle">
          {BRIEFING_KIND_LABEL[post.kind]} · 만든 날 {formatDateTime(post.createdAt)}
          {post.publishedAt && ` · 공개 ${formatDateTime(post.publishedAt)}`}
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <Card>
          <PostForm action={updatePost.bind(null, post.id)} post={post} cases={cases.items} submitLabel="저장" />
        </Card>
        <Card className="h-fit space-y-4">
          {published ? (
            <ActionForm action={setPostStatus.bind(null, post.id, "DRAFT")}>
              <Button>초안으로 내리기</Button>
              <p className="text-xs text-subtle">브리핑룸에서 사라집니다.</p>
            </ActionForm>
          ) : (
            <ActionForm action={setPostStatus.bind(null, post.id, "PUBLISHED")}>
              <Button tone="ok">브리핑룸에 공개</Button>
              <p className="text-xs text-subtle">공개 전에 내용을 저장했는지 확인해 주세요.</p>
            </ActionForm>
          )}
          <ActionForm action={deletePost.bind(null, post.id)} confirmMessage="이 글을 지울까요? 되돌릴 수 없습니다.">
            <Button tone="danger">지우기</Button>
          </ActionForm>
          <Link href="/briefing" className="block text-sm underline">
            브리핑룸 보기
          </Link>
        </Card>
      </div>
    </div>
  );
}
