import { API_URL } from "@/lib/cases/api";
import { sessionToken } from "@/lib/account/session";

/** 나의 기록 '더 불러오기'. 세션 토큰을 헤더로 옮겨 API에 넘김 */
export async function GET(request: Request) {
  const token = await sessionToken();
  if (!token) return Response.json({ message: "다시 로그인해 주세요." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams({ kind: searchParams.get("kind") ?? "", before: searchParams.get("before") ?? "" });
  try {
    const res = await fetch(`${API_URL}/account/me/activity?${qs}`, {
      headers: { "x-user-session": token },
      cache: "no-store",
    });
    return Response.json(await res.json(), { status: res.status });
  } catch {
    return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
  }
}
