import Link from "next/link";

export default function CaseNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-24 text-center">
      <p className="font-mono text-sm text-subtle">404</p>
      <h1 className="mt-2 text-2xl font-bold">이 사건 파일은 찾을 수 없습니다</h1>
      <Link href="/cases" className="mt-6 inline-block font-semibold text-brand-fg">
        사건방으로 돌아가기
      </Link>
    </main>
  );
}
