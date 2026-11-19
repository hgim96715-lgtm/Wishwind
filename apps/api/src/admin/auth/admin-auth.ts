import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** 관리자 세션 토큰 수명. 쿠키 maxAge와 같게 맞춤 */
export const ADMIN_SESSION_HOURS = 12;

interface TokenPayload {
  sub: 'admin';
  iat: number;
  exp: number;
}

const b64 = (buf: Buffer) => buf.toString('base64url');

function sign(data: string, secret: string) {
  return b64(createHmac('sha256', secret).update(data).digest());
}

/** 길이가 달라도 비교 시간이 같도록 해시끼리 비교함 */
export function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function issueToken(secret: string, now = Date.now()) {
  const payload: TokenPayload = {
    sub: 'admin',
    iat: now,
    exp: now + ADMIN_SESSION_HOURS * 60 * 60 * 1000,
  };
  const body = b64(Buffer.from(JSON.stringify(payload)));
  return { token: `${body}.${sign(body, secret)}`, expiresAt: payload.exp };
}

export function verifyToken(token: string, secret: string, now = Date.now()) {
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra !== undefined) return false;
  if (!safeEqual(signature, sign(body, secret))) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
    return payload.sub === 'admin' && typeof payload.exp === 'number' && payload.exp > now;
  } catch {
    return false;
  }
}

/** 메모리 기반 로그인 시도 제한. 서버가 한 대라는 가정 (여러 대가 되면 DB/Redis로 옮김) */
export class LoginThrottle {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max = 5,
    private readonly windowMs = 15 * 60 * 1000,
  ) {}

  isLocked(key: string, now = Date.now()) {
    const entry = this.attempts.get(key);
    if (!entry || entry.resetAt <= now) return false;
    return entry.count >= this.max;
  }

  fail(key: string, now = Date.now()) {
    const entry = this.attempts.get(key);
    if (!entry || entry.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count += 1;
    }
  }

  reset(key: string) {
    this.attempts.delete(key);
  }
}

/** 비밀값이 없을 때 쓰는 프로세스 단위 임시 값 (방문자 해시용) */
export const processSalt = b64(randomBytes(32));
