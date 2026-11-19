import { forwardAsVoter, forwardRead } from "@/lib/cases/voter-proxy";

/** 구름 놓기 → NestJS 프록시. 익명 ID는 httpOnly 쿠키로만 다룸 (브라우저 JS가 읽지 못함) */
export async function GET() {
  return forwardRead("/missing-clouds");
}

export async function POST(request: Request) {
  return forwardAsVoter("/missing-clouds", "POST", await request.text());
}
