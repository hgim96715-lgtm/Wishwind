import { fetchNickname, isLoggedIn } from "@/lib/account/session";

/** 클라이언트 화면에서 로그인 여부와 계정 닉네임 확인 (세션 쿠키는 httpOnly라 JS가 직접 못 읽음) */
export async function GET() {
  const loggedIn = await isLoggedIn();
  const nickname = loggedIn ? await fetchNickname() : null;
  return Response.json({ loggedIn, nickname }, { headers: { "cache-control": "no-store" } });
}
