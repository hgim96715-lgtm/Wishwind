import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/cases/api";

export const ADMIN_COOKIE = "cold_cases_admin";
/** API 토큰 수명(12시간)과 같게 맞춤 */
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 12;

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function token() {
  return (await cookies()).get(ADMIN_COOKIE)?.value;
}

function messageOf(body: unknown, status: number) {
  const message = (body as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return `처리하지 못했습니다 (${status}).`;
}

/**
 * 관리자 API 호출. 서버(컴포넌트·서버 함수)에서만 씀.
 * 토큰은 httpOnly 쿠키에만 있고 브라우저 JS로는 읽을 수 없음 → Next 서버가 Authorization 헤더로 옮겨 실어 보냄
 */
export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const value = await token();
  if (!value) redirect("/admin/login");
  let res: Response;
  try {
    res = await fetch(`${API_URL}/admin${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
        authorization: `Bearer ${value}`,
      },
    });
  } catch {
    throw new AdminApiError("API 서버에 연결할 수 없습니다. pnpm dev:api가 켜져 있는지 확인해 주세요.", 503);
  }
  if (res.status === 401) redirect("/admin/login");
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) throw new AdminApiError(messageOf(body, res.status), res.status);
  return body as T;
}

export const adminGet = <T>(path: string) => adminFetch<T>(path);

export function adminSend<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
  return adminFetch<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** 로그인 시도 제한용. 프록시 뒤에 있으면 x-forwarded-for의 첫 번째 값이 실제 브라우저 IP */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
