import { describe, expect, it } from 'vitest';
import { relatedAddSchema } from './admin-cases.dto.js';

const base = { kind: 'TV_PROGRAM', title: '그것이 알고 싶다 1234회', platform: 'SBS', url: 'https://programs.sbs.co.kr/x' };

describe('관련 콘텐츠 입력 검사', () => {
  it('빈 칸은 null, 연도 문자열은 숫자로 바꿈', () => {
    const v = relatedAddSchema.parse({ ...base, creator: '', releaseYear: '2021', note: '' });
    expect(v).toMatchObject({ creator: null, releaseYear: 2021, note: null, language: 'ko', isDramatized: false });
    expect(relatedAddSchema.parse({ ...base, releaseYear: '' }).releaseYear).toBeNull();
  });

  it('위키 주소와 http 주소는 받지 않음', () => {
    expect(() => relatedAddSchema.parse({ ...base, url: 'https://ko.wikipedia.org/wiki/x' })).toThrow();
    expect(() => relatedAddSchema.parse({ ...base, url: 'https://namu.wiki/w/x' })).toThrow();
    expect(() => relatedAddSchema.parse({ ...base, url: 'http://example.com' })).toThrow();
  });

  it('각색 작품은 메모가 있어야 함', () => {
    expect(() => relatedAddSchema.parse({ ...base, kind: 'MOVIE', isDramatized: true })).toThrow();
    expect(relatedAddSchema.parse({ ...base, kind: 'MOVIE', isDramatized: true, note: '사건을 모티브로 한 극영화' }).isDramatized).toBe(true);
  });
});
