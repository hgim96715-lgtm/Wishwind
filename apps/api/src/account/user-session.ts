import { createHmac } from 'node:crypto';
import { safeEqual } from '../admin/auth/admin-auth.js';

/** 로그인 유지 기간. 웹 쿠키 maxAge와 같게 맞춤 */
export const USER_SESSION_DAYS = 30;

interface Payload {
  sub: string;
  typ: 'user';
  exp: number;
}

const b64 = (buf: Buffer) => buf.toString('base64url');
const sign = (data: string, secret: string) => b64(createHmac('sha256', secret).update(data).digest());

/** 서명한 세션 토큰 (body.signature). DB에 세션을 저장하지 않음 → 탈퇴 시 users 행이 없어지면 바로 무효 */
export function issueUserToken(userId: string, secret: string, now = Date.now()) {
  const payload: Payload = { sub: userId, typ: 'user', exp: now + USER_SESSION_DAYS * 24 * 60 * 60 * 1000 };
  const body = b64(Buffer.from(JSON.stringify(payload)));
  return { token: `${body}.${sign(body, secret)}`, expiresAt: payload.exp };
}

/** 맞으면 userId, 틀리거나 만료면 null */
export function verifyUserToken(token: string, secret: string, now = Date.now()): string | null {
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra !== undefined) return null;
  if (!safeEqual(signature, sign(body, secret))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as Partial<Payload>;
    if (p.typ !== 'user' || typeof p.sub !== 'string' || typeof p.exp !== 'number' || p.exp <= now) return null;
    return p.sub;
  } catch {
    return null;
  }
}
