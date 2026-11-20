import { forwardAsVoter } from "@/lib/cases/voter-proxy";

/** 내가 보낸 글 지우기. 본인 확인은 API가 익명 ID로 함 */
export async function POST(_: Request, ctx: RouteContext<"/api/inquiries/[id]/delete">) {
  const { id } = await ctx.params;
  return forwardAsVoter(`/inquiries/${encodeURIComponent(id)}/delete`, "POST", "{}");
}
