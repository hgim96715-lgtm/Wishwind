import { describe, expect, it } from 'vitest';
import { cloudSchema } from './dto/clouds.dto.js';
import { DAILY_LIMIT, moderationText, startOfKstDay } from './clouds.service.js';

describe('바람개비 닉네임', () => {
  it('닉네임이 있으면 메시지와 함께 검사함', () => {
    expect(moderationText('모두 돌아와주세요', '호하')).toBe('모두 돌아와주세요\n\n[닉네임] 호하');
    expect(moderationText('모두 돌아와주세요')).toBe('모두 돌아와주세요');
  });

  it('닉네임은 2~10자만 받고, 짧거나 비면 없는 것으로 봄', () => {
    expect(cloudSchema.parse({ body: '돌아와 주세요', nickname: ' 호하 ' }).nickname).toBe('호하');
    expect(cloudSchema.parse({ body: '돌아와 주세요', nickname: '호' }).nickname).toBeUndefined();
    expect(cloudSchema.parse({ body: '돌아와 주세요' }).nickname).toBeUndefined();
    expect(() => cloudSchema.parse({ body: '돌아와 주세요', nickname: '가'.repeat(11) })).toThrow();
  });
});

describe('바람개비 하루 제한', () => {
  it('하루에 하나만 꽂을 수 있음', () => {
    expect(DAILY_LIMIT).toBe(1);
  });

  it('하루의 시작은 한국 시간 자정', () => {
    // 한국 시간 11월 21일 오전 8시 = UTC 11월 20일 23시
    expect(startOfKstDay(new Date('2026-11-20T23:00:00Z')).toISOString()).toBe('2026-11-20T15:00:00.000Z');
    // 한국 시간 11월 21일 오전 0시 30분 → 같은 날 0시
    expect(startOfKstDay(new Date('2026-11-20T15:30:00Z')).toISOString()).toBe('2026-11-20T15:00:00.000Z');
    // 한국 시간 11월 20일 오후 11시 59분 → 전날 0시
    expect(startOfKstDay(new Date('2026-11-20T14:59:00Z')).toISOString()).toBe('2026-11-19T15:00:00.000Z');
  });
});
