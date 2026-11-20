import { cookies } from "next/headers";
import { ADMIN_HINT_COOKIE } from "@/lib/admin/session";
import { API_URL } from "@/lib/cases/api";

/**
 * 페이지 조회 기록. IP·브라우저 정보는 API로 넘겨 해시만 만들고 원문은 저장하지 않음.
 * 기록 실패는 사용자에게 영향을 주지 않도록 항상 204로 답함
 */
export async function POST(request: Request) {
  // 관리자로 로그인한 사람(관리실 표시 쿠키)이 둘러본 것은 방문자 분석에 넣지 않음
  if ((await cookies()).get(ADMIN_HINT_COOKIE)?.value === "1") return new Response(null, { status: 204 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  const ua = request.headers.get("user-agent") ?? "";
  const host = (request.headers.get("host") ?? "").replace(/:\d+$/, "").replace(/^www\./, "");
  try {
    await fetch(`${API_URL}/analytics/pageview`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-visitor-ip": ip,
        "x-visitor-ua": ua.slice(0, 500),
        "x-site-host": host,
      },
      body: (await request.text()).slice(0, 2000),
      cache: "no-store",
    });
  } catch {
    // API가 꺼져 있어도 무시
  }
  return new Response(null, { status: 204 });
}
