import Link from "next/link";
import { fetchNickname, isLoggedIn } from "@/lib/account/session";

/** 홈 오른쪽 위 작은 링크. 로그인은 선택이라 눈에 띄지 않게 둠. 로그인했으면 "○○님의 기록" */
export async function AccountLink() {
  const loggedIn = await isLoggedIn();
  const nickname = loggedIn ? await fetchNickname() : null;
  return (
    <Link
      href={loggedIn ? "/me" : "/login"}
      className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white hover:text-foreground"
    >
      {loggedIn ? (nickname ? `${nickname}님의 기록` : "내 기록") : "로그인"}
    </Link>
  );
}
