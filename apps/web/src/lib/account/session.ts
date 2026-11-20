import { cookies } from "next/headers";
import { API_URL } from "@/lib/cases/api";
import { VOTER_COOKIE, VOTER_COOKIE_MAX_AGE } from "@/lib/cases/voter-proxy";
import type { Me, Providers } from "./types";

export const SESSION_COOKIE = "cold_cases_session";
/** API 토큰 수명(30일)과 같게 맞춤 */
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
/** 로그인 화면에 다녀오는 동안만 쓰는 state 쿠키 (CSRF 방지) */
export const STATE_COOKIE = "cold_cases_oauth_state";

export const PROVIDERS = ["naver", "google"] as const;
export type ProviderName = (typeof PROVIDERS)[number];
export const isProvider = (v: string): v is ProviderName => (PROVIDERS as readonly string[]).includes(v);

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function isLoggedIn() {
  return !!(await sessionToken());
}

export async function setSession(token: string, voterId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { ...cookieBase, maxAge: SESSION_COOKIE_MAX_AGE });
  // 앞으로의 활동은 계정의 익명 ID로 남음
  store.set(VOTER_COOKIE, voterId, { ...cookieBase, maxAge: VOTER_COOKIE_MAX_AGE });
}

/** 로그아웃: 세션을 지우고 새 익명 ID를 줌 → 같은 기기를 쓰는 다음 사람이 내 계정으로 글을 남기지 않게 */
export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.set(VOTER_COOKIE, crypto.randomUUID(), { ...cookieBase, maxAge: VOTER_COOKIE_MAX_AGE });
}

export async function fetchProviders(): Promise<Providers> {
  try {
    const res = await fetch(`${API_URL}/account/providers`, { cache: "no-store" });
    if (res.ok) return (await res.json()) as Providers;
  } catch {
    // API가 꺼져 있으면 버튼을 끔
  }
  return { naver: false, google: false };
}

/** 내 기록. 로그인 안 했거나 세션이 만료되면 null */
export async function fetchMe(): Promise<Me | null> {
  const token = await sessionToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/account/me`, { headers: { "x-user-session": token }, cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`내 기록을 불러오지 못했습니다 (${res.status})`);
  return (await res.json()) as Me;
}

/** 계정 닉네임만 가볍게. 로그인 안 했거나 세션이 만료되면 null */
export async function fetchNickname(): Promise<string | null> {
  const token = await sessionToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/account/profile`, { headers: { "x-user-session": token }, cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { nickname: string }).nickname;
  } catch {
    return null;
  }
}
