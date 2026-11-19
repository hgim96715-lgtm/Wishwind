import { forwardAsVoter, forwardRead } from "@/lib/cases/voter-proxy";

const votesPath = (id: string) => `/sentences/${encodeURIComponent(id)}/votes`;

export async function GET(_: Request, ctx: RouteContext<"/api/sentences/[id]/vote">) {
  const { id } = await ctx.params;
  return forwardRead(votesPath(id));
}

export async function PUT(request: Request, ctx: RouteContext<"/api/sentences/[id]/vote">) {
  const { id } = await ctx.params;
  return forwardAsVoter(votesPath(id), "PUT", await request.text());
}
