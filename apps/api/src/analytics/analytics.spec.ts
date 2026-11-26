import { appFromUserAgent, fillDays, growthTips, pathLabel, referrerLabel, sourceOf } from './analytics.mapper.js';

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

describe('앱 안 브라우저와 링크 표시', () => {
  it('접속 정보에서 앱 이름을 찾고, 모르면 null', () => {
    expect(appFromUserAgent('Mozilla/5.0 (iPhone) Instagram 350.0.0')).toBe('app:instagram');
    expect(appFromUserAgent('Mozilla/5.0 (Android) KAKAOTALK 10.4')).toBe('app:kakaotalk');
    expect(appFromUserAgent('Mozilla/5.0 (iPhone) Safari/604.1')).toBeNull();
  });

  it('들어온 곳 분류와 화면 이름', () => {
    expect(sourceOf('app:instagram')).toBe('sns');
    expect(sourceOf('app:naver')).toBe('search');
    expect(sourceOf('utm:instagram')).toBe('sns');
    expect(referrerLabel('app:instagram')).toBe('인스타그램 앱 안 브라우저');
    expect(referrerLabel('utm:instagram')).toBe('instagram (링크 표시)');
    expect(referrerLabel(null)).toBe('직접·출처 없음');
  });

  it('이름이 정해진 페이지는 주소 대신 이름으로 보임', () => {
    expect(pathLabel('/changes', new Map())).toBe('사건이 바꾼 것들');
  });
});
