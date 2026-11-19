import type { Metadata } from "next";
import { Suspense } from "react";
import { InquiryList } from "@/components/admin/InquiryList";
import { PageTitle, Skeleton } from "@/components/admin/ui";

export const metadata: Metadata = { title: "문의" };

export default function InquiriesPage({ searchParams }: PageProps<"/admin/inquiries">) {
  return (
    <>
      <PageTitle
        title="문의"
        description="사람들이 ‘문의하기’에서 보낸 질문과 정정 요청입니다. 연락처를 받지 않으므로 답변은 사이트에서만 볼 수 있습니다."
      />
      <Suspense fallback={<Skeleton />}>
        {searchParams.then((sp) => (
          <InquiryList group="inquiry" status={typeof sp.status === "string" ? sp.status : ""} basePath="/admin/inquiries" />
        ))}
      </Suspense>
    </>
  );
}
