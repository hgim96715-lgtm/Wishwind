import { describe, expect, it } from 'vitest';
import { claudeModel, claudeModelWarning, DEFAULT_CLAUDE_MODEL } from './claude-model.js';

describe('CLAUDE_MODEL', () => {
  it('비어 있으면 기본 모델', () => {
    expect(claudeModel(undefined)).toBe(DEFAULT_CLAUDE_MODEL);
    expect(claudeModel('  ')).toBe(DEFAULT_CLAUDE_MODEL);
    expect(claudeModelWarning('')).toBeNull();
  });

  it('지원하는 모델은 그대로 씀', () => {
    expect(claudeModel('claude-haiku-5-5')).toBe('claude-haiku-5-5');
    expect(claudeModel(' claude-sonnet-5-5 ')).toBe('claude-sonnet-5-5');
    expect(claudeModel('claude-opus-4-8')).toBe('claude-opus-4-8');
    expect(claudeModelWarning('claude-haiku-5-5')).toBeNull();
  });

  it('adaptive thinking을 받지 않는 모델은 기본 모델로 돌아가고 경고함', () => {
    expect(claudeModel('claude-haiku-4-5')).toBe(DEFAULT_CLAUDE_MODEL);
    expect(claudeModelWarning('claude-haiku-4-5')).toContain('claude-haiku-5-5');
  });
});
