import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "관리실 로그인",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 shadow-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">Case Office</p>
        <h1 className="mt-1 text-2xl font-semibold">관리실</h1>
        <p className="mt-2 text-sm text-muted">관리자 비밀번호를 입력해 주세요.</p>
        <LoginForm />
      </div>
    </main>
  );
}
