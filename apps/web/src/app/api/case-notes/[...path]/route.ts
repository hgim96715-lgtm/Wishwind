import { forwardAsVoter, forwardRead } from "@/lib/cases/voter-proxy";

type Context = RouteContext<"/api/case-notes/[...path]">;

async function notesPath(ctx: Context) {
  const { path } = await ctx.params;
  return `/case-notes/${path.map(encodeURIComponent).join("/")}`;
}

export async function GET(_: Request, ctx: Context) {
  return forwardRead(await notesPath(ctx));
}

export async function PUT(request: Request, ctx: Context) {
  return forwardAsVoter(await notesPath(ctx), "PUT", await request.text());
}

export async function POST(request: Request, ctx: Context) {
  return forwardAsVoter(await notesPath(ctx), "POST", await request.text());
}
