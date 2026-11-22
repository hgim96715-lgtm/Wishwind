import { fillDays, pathLabel, growthTips, sourceOf } from './analytics.mapper.js';

describe('fillDays', () => {
  it('빈 날을 0으로 채우고 날짜 순서를 유지함', () => {
    const now = Date.parse('2026-11-19T03:00:00Z'); // KST 12:00
    const rows = fillDays([{ day: '2026-11-18', views: 4, visitors: 2 }], 3, now);
    expect(rows.map((r) => r.day)).toEqual(['2026-11-17', '2026-11-18', '2026-11-19']);
    expect(rows[1]).toEqual({ day: '2026-11-18', views: 4, visitors: 2 });
    expect(rows[2].views).toBe(0);
  });
});

describe('pathLabel', () => {
  const titles = new Map([['hwaseong', '화성 연쇄살인 사건']]);
  it('주소를 방 이름·사건 제목으로 바꿈', () => {
    expect(pathLabel('/briefing', titles)).toBe('브리핑룸');
    expect(pathLabel('/', titles)).toBe('홈');
    expect(pathLabel('/cases/hwaseong', titles)).toBe('사건방 · 화성 연쇄살인 사건');
    expect(pathLabel('/cases/unknown', titles)).toBe('사건방 · 사건 파일');
  });
});

describe('들어온 곳 분류와 할 일 제안', () => {
  it('검색·SNS·직접·다른 사이트로 나눔', () => {
    expect(sourceOf(null)).toBe('direct');
    expect(sourceOf('google.com')).toBe('search');
    expect(sourceOf('search.naver.com')).toBe('search');
    expect(sourceOf('l.instagram.com')).toBe('sns');
    expect(sourceOf('t.co')).toBe('sns');
    expect(sourceOf('example.org')).toBe('other');
  });

  it('검색 유입이 적고 SNS가 없으면 그에 맞는 제안을 함', () => {
    const tips = growthTips({ days: 7, visitorDays: 6, sources: { search: 0, sns: 0, direct: 6, other: 0 }, singlePageVisitors: 5, peakHour: 21 });
    expect(tips.some((t) => t.includes('검색으로 들어온 방문이 0%'))).toBe(true);
    expect(tips.some((t) => t.includes('SNS에서 들어온 방문이 아직 없습니다'))).toBe(true);
    expect(tips.some((t) => t.includes('한 페이지만 보고'))).toBe(true);
    expect(tips.some((t) => t.includes('오후 9시대'))).toBe(true);
  });
});
