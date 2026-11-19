import { LoginThrottle, issueToken, safeEqual, verifyToken } from './admin-auth.js';

const SECRET = 'x'.repeat(40);

describe('admin token', () => {
  it('발급한 토큰은 검증을 통과함', () => {
    const { token } = issueToken(SECRET, 1000);
    expect(verifyToken(token, SECRET, 2000)).toBe(true);
  });

  it('만료되거나 비밀값이 다르거나 변조되면 거부함', () => {
    const { token, expiresAt } = issueToken(SECRET, 1000);
    expect(verifyToken(token, SECRET, expiresAt + 1)).toBe(false);
    expect(verifyToken(token, 'y'.repeat(40), 2000)).toBe(false);
    const [body, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'admin', iat: 0, exp: 9e15 })).toString('base64url');
    expect(verifyToken(`${forged}.${sig}`, SECRET, 2000)).toBe(false);
    expect(verifyToken(`${body}.${sig}.x`, SECRET, 2000)).toBe(false);
    expect(verifyToken('', SECRET, 2000)).toBe(false);
  });

  it('safeEqual은 길이가 달라도 동작함', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('LoginThrottle', () => {
  it('5번 실패하면 잠기고 시간이 지나면 풀림', () => {
    const t = new LoginThrottle(5, 1000);
    for (let i = 0; i < 5; i++) t.fail('ip', 0);
    expect(t.isLocked('ip', 10)).toBe(true);
    expect(t.isLocked('ip', 1001)).toBe(false);
  });
});
