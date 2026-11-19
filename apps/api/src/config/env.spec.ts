import { validateEnv } from './env.js';

const base = { DATABASE_URL: 'postgresql://u:p@localhost:5434/db' };

describe('validateEnv', () => {
  it('기본값을 채우고 문자열을 타입으로 바꿈', () => {
    const env = validateEnv({ ...base, PORT: '4100', MISSING_SYNC_ENABLED: 'false' });
    expect(env.PORT).toBe(4100);
    expect(env.MISSING_SYNC_ENABLED).toBe(false);
    expect(env.MISSING_SYNC_INTERVAL_HOURS).toBe(6);
  });

  it('빈 값은 없는 것으로 봄', () => {
    const env = validateEnv({ ...base, SAFE182_ESNTL_ID: '', SAFE182_AUTH_KEY: '' });
    expect(env.SAFE182_ESNTL_ID).toBeUndefined();
  });

  it('필수 키가 없으면 이름만 알려 주고 값은 노출하지 않음', () => {
    expect(() => validateEnv({ DATABASE_URL: 'not-a-url-secret' })).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ DATABASE_URL: 'not-a-url-secret' })).not.toThrow(/secret/);
  });

  it('안전Dream 키는 둘 다 있거나 둘 다 없어야 함', () => {
    expect(() => validateEnv({ ...base, SAFE182_ESNTL_ID: 'id' })).toThrow(/SAFE182/);
  });
});
