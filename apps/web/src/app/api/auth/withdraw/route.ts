import { API_URL } from "@/lib/cases/api";
import { clearSession, sessionToken } from "@/lib/account/session";

/** 탈퇴: 계정 연결 정보를 지우고 로그아웃 */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  // 다른 사이트에서 보낸 폼 요청은 거부
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response("Forbidden", { status: 403 });
  const token = await sessionToken();
  if (token) {
    const res = await fetch(`${API_URL}/account/me`, {
      method: "DELETE",
      headers: { "x-user-session": token },
      cache: "no-store",
    }).catch(() => null);
    if (!res || (!res.ok && res.status !== 401)) return Response.redirect(`${origin}/me?error=withdraw`, 303);
  }
  await clearSession();
  return Response.redirect(`${origin}/?withdrawn=1`, 303);
}
