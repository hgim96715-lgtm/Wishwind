import type { Metadata } from "next";
import Link from "next/link";
import { HomeLogo } from "@/components/common/HomeLogo";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { fetchProviders, isLoggedIn } from "@/lib/account/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "로그인",
  description: "로그인하면 남긴 수사 노트와 바람개비를 어느 기기에서든 모아 볼 수 있습니다.",
};

const ERRORS: Record<string, string> = {
  cancelled: "로그인을 취소했습니다.",
  state: "로그인 요청이 만료됐습니다. 다시 시도해 주세요.",
  login: "로그인하지 못했습니다. 다시 시도해 주세요.",
  unavailable: "지금은 로그인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  provider: "지원하지 않는 로그인 방법입니다.",
};

// 쿠키·검색어·API를 읽는 부분만 Suspense 안에서 요청마다 그림 (cacheComponents: 바깥은 정적 셸)
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
      <HomeLogo />
      <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-subtle">Detective ID</p>
      <h1 className="text-3xl font-semibold tracking-tight">로그인</h1>
      <p className="mt-4 leading-7 text-muted">
        로그인하지 않아도 모든 사건을 둘러보고 수사 노트를 남길 수 있습니다. 로그인하면 지금까지 이 기기에서 남긴 기록이 계정으로
        옮겨지고, 다른 기기에서도 내 기록을 모아 볼 수 있습니다.
      </p>

      <Suspense fallback={<div className="mt-8 h-28 animate-pulse rounded-xl bg-line/50" />}>
        <LoginOptions searchParams={searchParams} />
      </Suspense>

      <p className="mt-8 text-xs leading-6 text-subtle">
        이메일·이름·사진은 받지 않고, 계정을 구분하는 번호와 직접 정한 닉네임만 저장합니다. 자세한 내용은{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          개인정보 처리방침
        </Link>
        에서 볼 수 있습니다.
      </p>
    </main>
  );
}

async function LoginOptions({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  // 사람마다 다른 화면(쿠키) → 요청 시점에 그린다고 먼저 알림. 이후의 API 호출·시각 계산이 미리 그리기(prerender)에 섞이지 않음
  await connection();
  if (await isLoggedIn()) redirect("/me");
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  const next = typeof sp.next === "string" ? `?next=${encodeURIComponent(sp.next)}` : "";
  const providers = await fetchProviders();
  const none = !providers.naver && !providers.google;

  return (
    <>
      {error && <p className="mt-6 rounded-lg bg-clay-wash px-4 py-3 text-sm text-clay-ink-deep">{error}</p>}

      <div className="mt-8 flex flex-col gap-3">
        {providers.naver && (
          <a
            href={`/api/auth/naver${next}`}
            className="relative flex h-12 items-center justify-center rounded-xl bg-[#03c75a] text-[15px] font-semibold text-white transition-colors hover:bg-[#02b350]"
          >
            <NaverLogo />
            네이버로 계속하기
          </a>
        )}
        {providers.google && (
          <a
            href={`/api/auth/google${next}`}
            className="relative flex h-12 items-center justify-center rounded-xl border border-[#dadce0] bg-white text-[15px] font-semibold text-[#1f1f1f] transition-colors hover:bg-[#f8f9fa]"
          >
            <GoogleLogo />
            Google로 계속하기
          </a>
        )}
        {none && (
          <p className="rounded-lg bg-surface px-4 py-3 text-sm text-muted">로그인은 준비 중입니다. 조금만 기다려 주세요.</p>
        )}
      </div>
    </>
  );
}

/** 버튼 왼쪽에 고정되는 로고 자리. 글자는 버튼 가운데 그대로 둠 */
const LOGO_SLOT = "absolute left-4 top-1/2 size-5 -translate-y-1/2";

/** 네이버 로그인 버튼 가이드의 흰색 N 로고 */
function NaverLogo() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={LOGO_SLOT}>
      <path fill="#fff" d="M13.56 10.7 6.17 0H0v20h6.44V9.3L13.83 20H20V0h-6.44z" transform="translate(2.5 2.5) scale(0.75)" />
    </svg>
  );
}

/** Google 로그인 버튼 가이드의 네 가지 색 G 로고 */
function GoogleLogo() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className={LOGO_SLOT}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
