import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_HINT_COOKIE } from "@/lib/admin/session";
import { fetchNickname, isLoggedIn } from "@/lib/account/session";

/** 홈 오른쪽 위 작은 링크. 관리실에서 둘러보는 중이면 로그인 대신 복귀 링크를 보여 줌 */
export async function AccountLink() {
  const adminViewing = (await cookies()).get(ADMIN_HINT_COOKIE)?.value === "1";
  if (adminViewing) {
    return (
      <Link
        href="/admin"
        className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white hover:text-foreground"
      >
        관리실로 돌아가기
      </Link>
    );
  }

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
