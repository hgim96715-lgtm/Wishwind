import { API_URL } from "@/lib/cases/api";

/** 카드의 "번역하기" → NestJS 번역 API 프록시. 상태 코드와 메시지를 그대로 전달 */
export async function GET(_req: Request, ctx: RouteContext<"/missing/person/[id]/translation">) {
  const { id } = await ctx.params;
  try {
    const res = await fetch(`${API_URL}/missing/${encodeURIComponent(id)}/translation`);
    const body: unknown = await res.json().catch(() => ({ message: "번역 응답을 읽지 못했습니다" }));
    return Response.json(body, { status: res.status });
  } catch {
    return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
  }
}
