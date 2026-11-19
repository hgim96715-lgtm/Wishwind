import type { Metadata } from "next";
import { Suspense } from "react";
import { InquiryList } from "@/components/admin/InquiryList";
import { PageTitle, Skeleton } from "@/components/admin/ui";

export const metadata: Metadata = { title: "의견" };

export default function FeedbackPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <PageTitle title="의견" description="사이트에 대한 생각, 바라는 점, 불편한 점을 모아 봅니다." />
      <Suspense fallback={<Skeleton />}>
        {searchParams.then((sp) => (
          <InquiryList group="feedback" status={typeof sp.status === "string" ? sp.status : ""} basePath="/admin/feedback" />
        ))}
      </Suspense>
    </>
  );
}
