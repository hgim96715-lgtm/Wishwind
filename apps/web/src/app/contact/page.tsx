import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ContactForm } from "@/components/briefing/ContactForm";

export const metadata: Metadata = {
  title: "문의·의견 보내기",
  description: "잘못된 내용 정정, 궁금한 점, 사이트에 바라는 점을 남겨 주세요.",
};

export default function ContactPage({ searchParams }: PageProps<"/contact">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link href="/briefing" className="inline-flex items-center rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-muted shadow-sm transition-colors hover:bg-white hover:text-foreground">
        브리핑룸으로
      </Link>
      <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-subtle">Tip Line</p>
      <h1 className="text-3xl font-semibold tracking-tight">문의·의견 보내기</h1>
      <p className="mt-4 text-muted">
        사건 기록에서 틀린 부분을 찾았거나, 궁금한 점이나 바라는 점이 있다면 알려 주세요. 이름이나 연락처는 받지 않습니다.
        답변은 이 페이지에서 확인할 수 있습니다.
      </p>
      <p className="mt-2 text-sm text-subtle">
        실종자를 보셨거나 사건 제보가 있다면 이곳보다 경찰(112, 실종 182)에 바로 알려 주세요.
      </p>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-xl bg-line/50" />}>
        {searchParams.then((sp) => (
          <ContactForm initialCase={typeof sp.case === "string" ? sp.case : ""} />
        ))}
      </Suspense>
    </main>
  );
}
