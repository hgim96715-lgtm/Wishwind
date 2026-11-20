import { issueUserToken, verifyUserToken } from './user-session.js';

const SECRET = 'x'.repeat(40);

describe('user session token', () => {
  it('맞는 토큰이면 userId를 돌려줌', () => {
    const { token } = issueUserToken('user-1', SECRET, 1000);
    expect(verifyUserToken(token, SECRET, 2000)).toBe('user-1');
  });

  it('만료·다른 비밀값·변조는 거부', () => {
    const { token, expiresAt } = issueUserToken('user-1', SECRET, 1000);
    expect(verifyUserToken(token, SECRET, expiresAt + 1)).toBeNull();
    expect(verifyUserToken(token, 'y'.repeat(40), 2000)).toBeNull();
    const [body, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'admin', typ: 'user', exp: 9e15 })).toString('base64url');
    expect(verifyUserToken(`${forged}.${sig}`, SECRET, 2000)).toBeNull();
    expect(verifyUserToken(`${body}.${sig}.x`, SECRET, 2000)).toBeNull();
  });
});
