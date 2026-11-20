import Link from "next/link";
import { Suspense } from "react";
import { PostForm } from "@/components/admin/PostForm";
import { Card, ErrorBox, PageTitle, Skeleton } from "@/components/admin/ui";
import { createPost } from "@/app/admin/actions";
import { AdminApiError, adminGet } from "@/lib/admin/session";
import type { AdminCaseList } from "@/lib/admin/types";

export default function NewPostPage({ searchParams }: PageProps<"/admin/briefing/new">) {
  return (
    <>
      <Link href="/admin/briefing" className="text-sm text-subtle hover:text-foreground">
        브리핑 글
      </Link>
      <div className="mt-2">
        <PageTitle title="새 브리핑 글" description="초안으로 저장됩니다. 다음 화면에서 공개할 수 있습니다." />
      </div>
      <Suspense fallback={<Skeleton />}>
        {searchParams.then((sp) => (
          <NewPost caseId={typeof sp.caseId === "string" ? sp.caseId : undefined} />
        ))}
      </Suspense>
    </>
  );
}

async function NewPost({ caseId }: { caseId?: string }) {
  let cases: AdminCaseList;
  try {
    cases = await adminGet<AdminCaseList>("/cases");
  } catch (error) {
    if (error instanceof AdminApiError) return <ErrorBox message={error.message} />;
    throw error;
  }
  return (
    <Card className="max-w-3xl">
      <PostForm action={createPost} cases={cases.items} defaultCaseId={caseId} submitLabel="초안 저장" />
    </Card>
  );
}
