import { cookies } from "next/headers";

/**
 * 개발 모드 전용: 익명 ID 쿠키를 잠깐 새 ID로 바꿔 "다른 사람 눈에 보이는 화면"을 확인함.
 * 원래 ID는 따로 보관했다가 "내 화면으로"를 누르면 되돌림. 운영(production)에서는 404
 */
// voter-proxy.ts의 VOTER_COOKIE와 같은 이름
const VOTER_COOKIE = "cold_cases_voter";
const REAL_VOTER_COOKIE = "dev_real_voter";
/** 화면의 버튼이 읽는 표시용 쿠키 (값은 1뿐, ID가 아님) */
const VIEWING_FLAG = "dev_viewing_as_other";
const HOUR = 60 * 60;

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });

  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const store = await cookies();
  const base = { httpOnly: true, sameSite: "lax" as const, path: "/" };

  if (action === "other") {
    // 처음 바꿀 때만 원래 ID를 보관 (다른 사람 → 또 다른 사람으로 바꿔도 원래 ID는 그대로)
    if (!store.get(REAL_VOTER_COOKIE)) {
      store.set(REAL_VOTER_COOKIE, store.get(VOTER_COOKIE)?.value ?? "", { ...base, maxAge: 12 * HOUR });
    }
    store.set(VOTER_COOKIE, crypto.randomUUID(), { ...base, maxAge: 12 * HOUR });
    store.set(VIEWING_FLAG, "1", { sameSite: "lax", path: "/", maxAge: 12 * HOUR });
  } else if (action === "back") {
    const real = store.get(REAL_VOTER_COOKIE)?.value;
    if (real) store.set(VOTER_COOKIE, real, { ...base, maxAge: 60 * 60 * 24 * 400 });
    else store.delete(VOTER_COOKIE);
    store.delete(REAL_VOTER_COOKIE);
    store.delete(VIEWING_FLAG);
  }

  // 누른 페이지로 돌아감 (같은 사이트 주소만)
  const back = new URL(request.headers.get("referer") ?? "/", request.url);
  const to = back.origin === new URL(request.url).origin ? back : new URL("/", request.url);
  return Response.redirect(to, 303);
}
