import { clearSession } from "@/lib/account/session";

/** 폼 POST로만 받음 (링크·이미지로 로그아웃시키는 장난 방지) */
export async function POST(request: Request) {
  // 다른 사이트에서 보낸 폼 요청은 거부
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response("Forbidden", { status: 403 });
  await clearSession();
  return Response.redirect(`${new URL(request.url).origin}/`, 303);
}
