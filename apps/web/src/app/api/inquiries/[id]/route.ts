import { forwardAsVoter } from "@/lib/cases/voter-proxy";

/** 내가 보낸 글 고치기 (관리자가 보기 전까지). 본인 확인은 API가 익명 ID로 함 */
export async function PUT(request: Request, ctx: RouteContext<"/api/inquiries/[id]">) {
  const { id } = await ctx.params;
  return forwardAsVoter(`/inquiries/${encodeURIComponent(id)}`, "PUT", await request.text());
}
