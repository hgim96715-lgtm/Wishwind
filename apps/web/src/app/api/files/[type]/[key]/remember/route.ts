import { API_URL } from "@/lib/cases/api";

type Ctx = RouteContext<"/api/files/[type]/[key]/remember">;

/** 개발 모드 '다른 사람으로 보기' 중이면 서버가 다른 방문자로 세도록 구분값을 덧붙임 (운영에서는 쓰지 않음) */
const visitorUa = (request: Request) => {
  const ua = request.headers.get("user-agent") ?? "";
  if (process.env.NODE_ENV !== "development") return ua;
  const viewer = request.headers.get("cookie")?.match(/(?:^|; )dev_viewing_as_other=([^;]+)/)?.[1];
  return viewer ? `${ua} dev-viewer:${viewer}` : ua;
};

const path = async (ctx: Ctx) => {
  const { type, key } = await ctx.params;
  return `${API_URL}/files/${encodeURIComponent(type)}/${encodeURIComponent(key)}/remember`;
};

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const res = await fetch(await path(ctx), { next: { revalidate: 60 } });
    return Response.json(await res.json().catch(() => ({})), { status: res.status });
  } catch {
    return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
  }
}

export async function POST(request: Request, ctx: Ctx) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  const ua = visitorUa(request);
  try {
    const res = await fetch(await path(ctx), {
      method: "POST",
      headers: { "x-visitor-ip": ip, "x-visitor-ua": ua.slice(0, 500) },
      cache: "no-store",
    });
    return Response.json(await res.json().catch(() => ({})), { status: res.status });
  } catch {
    return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  const ua = visitorUa(request);
  try {
    const res = await fetch(await path(ctx), {
      method: "DELETE",
      headers: { "x-visitor-ip": ip, "x-visitor-ua": ua.slice(0, 500) },
      cache: "no-store",
    });
    return Response.json(await res.json().catch(() => ({})), { status: res.status });
  } catch {
    return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
  }
}
