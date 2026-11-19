import { cookies } from "next/headers";
import { API_URL } from "@/lib/cases/api";

const VOTER_COOKIE = "cold_cases_voter";
// 브라우저가 허용하는 쿠키 수명 상한(400일)
const VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

async function forward(path: string, init: RequestInit) {
  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, cache: "no-store" });
    return Response.json(await res.json(), { status: res.status });
  } catch {
    return Response.json({ message: "API 서버에 연결할 수 없습니다" }, { status: 503 });
  }
}

export async function forwardRead(path: string) {
  const voterId = (await cookies()).get(VOTER_COOKIE)?.value;
  return forward(path, { headers: voterId ? { "x-voter-id": voterId } : undefined });
}

/** 첫 참여 때 익명 ID를 발급함. 개인정보 없이 브라우저만 구분하는 용도 */
export async function forwardAsVoter(path: string, method: "PUT" | "POST", body: string) {
  const store = await cookies();
  const voterId = store.get(VOTER_COOKIE)?.value ?? crypto.randomUUID();
  const response = await forward(path, {
    method,
    headers: { "content-type": "application/json", "x-voter-id": voterId },
    body,
  });
  if (response.ok) {
    store.set(VOTER_COOKIE, voterId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VOTER_COOKIE_MAX_AGE,
    });
  }
  return response;
}
