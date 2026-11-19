import { filterContent } from './content-filter.js';

describe('filterContent', () => {
  it.each([
    ['자세한 건 https://example.com 참고', 'URL'],
    ['010-1234-5678로 연락 주세요', 'PHONE'],
    ['메일은 a.b@example.com 입니다', 'EMAIL'],
    ['서울시 강남구 테헤란로 12에 삽니다', 'ADDRESS'],
  ])('blocks %s', (body, category) => {
    expect(filterContent(body, []).category).toBe(category);
  });

  it('blocks protected names even with spaces and removes them', () => {
    const result = filterContent('홍 길 동이 수상합니다', ['홍길동']);
    expect(result.category).toBe('PROTECTED_NAME');
    expect(result.redacted).not.toContain('길');
  });

  it('allows ordinary speculation', () => {
    const body = '범인은 왜 칼로 3번이나 찔렀을까요? 2019년 수사가 아쉽습니다.';
    expect(filterContent(body, ['홍길동']).category).toBeNull();
  });
});
