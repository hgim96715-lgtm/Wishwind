import { cookies } from "next/headers";
import { API_URL } from "@/lib/cases/api";
import { VOTER_COOKIE } from "@/lib/cases/voter-proxy";
import { isProvider, setSession, STATE_COOKIE } from "@/lib/account/session";

/** 네이버·구글에서 돌아오는 곳: state 확인 → API가 code를 계정으로 바꿈 → 세션 쿠키 */
export async function GET(request: Request, ctx: RouteContext<"/api/auth/[provider]/callback">) {
  const { provider } = await ctx.params;
  const url = new URL(request.url);
  const fail = (reason: string) => Response.redirect(`${url.origin}/login?error=${reason}`, 303);

  const store = await cookies();
  const saved = parseState(store.get(STATE_COOKIE)?.value);
  store.delete({ name: STATE_COOKIE, path: "/api/auth" });

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return fail("cancelled");
  if (!isProvider(provider) || !code || !state || !saved || saved.state !== state || saved.provider !== provider) {
    return fail("state");
  }

  const voterId = store.get(VOTER_COOKIE)?.value;
  try {
    const res = await fetch(`${API_URL}/account/login`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(voterId ? { "x-voter-id": voterId } : {}) },
      body: JSON.stringify({ provider, code, state, redirectUri: `${url.origin}/api/auth/${provider}/callback` }),
      cache: "no-store",
    });
    if (!res.ok) return fail("login");
    const r = (await res.json()) as { token: string; voterId: string };
    await setSession(r.token, r.voterId);
  } catch {
    return fail("unavailable");
  }
  return Response.redirect(`${url.origin}${saved.next}`, 303);
}

function parseState(raw: string | undefined): { state: string; provider: string; next: string } | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { state?: unknown; provider?: unknown; next?: unknown };
    if (typeof v.state !== "string" || typeof v.provider !== "string") return null;
    const next = typeof v.next === "string" && v.next.startsWith("/") && !v.next.startsWith("//") ? v.next : "/me";
    return { state: v.state, provider: v.provider, next };
  } catch {
    return null;
  }
}
