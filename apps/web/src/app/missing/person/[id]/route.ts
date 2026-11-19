import { ApiUnavailableError } from "@/lib/cases/api";
import { getMissing } from "@/lib/missing/api";

/**
 * 브라우저 → Next 서버 → NestJS 프록시.
 * 카드는 등불을 눌렀을 때만 필요하므로 목록에 싣지 않고 이 경로로 따로 받음.
 */
export async function GET(_req: Request, ctx: RouteContext<"/missing/person/[id]">) {
  const { id } = await ctx.params;
  try {
    const person = await getMissing(id);
    if (!person) {
      return Response.json({ message: "실종자 정보를 찾을 수 없습니다" }, { status: 404 });
    }
    return Response.json(person);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
    }
    throw error;
  }
}
