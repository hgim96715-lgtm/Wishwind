import { fillDays, pathLabel } from './analytics.mapper.js';

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
