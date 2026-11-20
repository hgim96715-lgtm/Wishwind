import { cookies } from "next/headers";
import { API_URL } from "@/lib/cases/api";
import { isProvider, STATE_COOKIE } from "@/lib/account/session";

/**
 * 로그인 시작: state를 만들어 쿠키에 넣고 네이버·구글 로그인 화면으로 보냄.
 * 클라이언트 키·주소는 API 서버가 만들어 줌 (웹에는 키를 두지 않음)
 */
export async function GET(request: Request, ctx: RouteContext<"/api/auth/[provider]">) {
  const { provider } = await ctx.params;
  const origin = new URL(request.url).origin;
  if (!isProvider(provider)) return Response.redirect(`${origin}/login?error=provider`, 303);

  const next = safeNext(new URL(request.url).searchParams.get("next"));
  const state = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const redirectUri = `${origin}/api/auth/${provider}/callback`;
  try {
    const q = new URLSearchParams({ provider, redirectUri, state });
    const res = await fetch(`${API_URL}/account/authorize-url?${q}`, { cache: "no-store" });
    if (!res.ok) return Response.redirect(`${origin}/login?error=unavailable`, 303);
    const { url } = (await res.json()) as { url: string };
    (await cookies()).set(STATE_COOKIE, JSON.stringify({ state, provider, next }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth",
      maxAge: 600,
    });
    return Response.redirect(url, 303);
  } catch {
    return Response.redirect(`${origin}/login?error=unavailable`, 303);
  }
}

/** 로그인 뒤 돌아갈 곳: 우리 사이트 안 경로만 (열린 리다이렉트 방지) */
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value.slice(0, 200) : "/me";
}
