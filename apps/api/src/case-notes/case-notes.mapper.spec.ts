import { describe, expect, it } from 'vitest';
import { mixNotes, nickname } from './case-notes.mapper.js';

describe('nickname', () => {
  it('같은 사람은 늘 같은 "바람 N" 별명', () => {
    const id = '0190a5f2-1111-7000-8000-000000000001';
    expect(nickname(id)).toBe(nickname(id));
    expect(nickname(id)).toMatch(/^바람 ([1-9]\d{0,2})$/);
  });
});

describe('mixNotes', () => {
  it('최근 글과 공감 많은 글을 번갈아 섞고 중복 없이 모두 담음', () => {
    const at = (h: number) => new Date(Date.UTC(2026, 10, 19, h));
    const rows = [
      { id: 'old-liked', createdAt: at(1), empathyCount: 9 },
      { id: 'mid', createdAt: at(2), empathyCount: 0 },
      { id: 'new', createdAt: at(3), empathyCount: 0 },
    ];
    const ids = mixNotes(rows).map((r) => r.id);
    expect(ids.slice(0, 2)).toEqual(['new', 'old-liked']);
    expect(new Set(ids).size).toBe(3);
  });
});
