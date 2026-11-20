import { API_URL } from "@/lib/cases/api";
import { sessionToken } from "@/lib/account/session";

/** 닉네임 바꾸기 ('○○님의 기록'에서). 세션 토큰을 헤더로 옮겨 API에 넘김 */
export async function PUT(request: Request) {
  const token = await sessionToken();
  if (!token) return Response.json({ message: "다시 로그인해 주세요." }, { status: 401 });
  try {
    const res = await fetch(`${API_URL}/account/me/nickname`, {
      method: "PUT",
      headers: { "content-type": "application/json", "x-user-session": token },
      body: await request.text(),
      cache: "no-store",
    });
    return Response.json(await res.json(), { status: res.status });
  } catch {
    return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
  }
}
