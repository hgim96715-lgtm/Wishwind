import { describe, expect, it } from 'vitest';
import { cloudSchema } from './dto/clouds.dto.js';
import { moderationText } from './clouds.service.js';

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
