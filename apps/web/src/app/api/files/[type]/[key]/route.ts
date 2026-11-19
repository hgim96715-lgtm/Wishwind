import { API_URL } from "@/lib/cases/api";

/**
 * 사건 파일·실종자 카드의 열람·공유 숫자 프록시 (브라우저 → Next → NestJS).
 * 기록할 때는 IP·브라우저 정보를 헤더로 넘겨 API에서 해시만 만들고 원문은 저장하지 않음
 */
type Ctx = RouteContext<"/api/files/[type]/[key]">;

const path = async (ctx: Ctx) => {
  const { type, key } = await ctx.params;
  return `${API_URL}/files/${encodeURIComponent(type)}/${encodeURIComponent(key)}`;
};

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const res = await fetch(`${await path(ctx)}/stats`, { next: { revalidate: 60 } });
    if (!res.ok) return Response.json({ message: "숫자를 불러오지 못했습니다" }, { status: res.status });
    return Response.json(await res.json(), { headers: { "cache-control": "public, max-age=60" } });
  } catch {
    return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
  }
}

export async function POST(request: Request, ctx: Ctx) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  const ua = request.headers.get("user-agent") ?? "";
  try {
    const res = await fetch(`${await path(ctx)}/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-visitor-ip": ip, "x-visitor-ua": ua.slice(0, 500) },
      body: (await request.text()).slice(0, 500),
      cache: "no-store",
    });
    return Response.json(await res.json().catch(() => ({})), { status: res.status });
  } catch {
    return Response.json({ recorded: false }, { status: 503 });
  }
}
