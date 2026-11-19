import { describe, expect, it } from 'vitest';
import { suggestCases, tokens } from './case-match.js';

const cases = [
  { id: 'a', title: '강북 모텔 약물 연쇄살인 사건', status: 'IN_PROGRESS', isPublished: true },
  { id: 'b', title: '광주 여고생 납치 살해 사건', status: 'IN_PROGRESS', isPublished: true },
  { id: 'c', title: '김창민 감독 사망 사건', status: 'IN_PROGRESS', isPublished: false },
];

describe('case match', () => {
  it('drops common crime words and particles', () => {
    expect(tokens('강북 모텔 약물 연쇄살인 사건')).toEqual(['강북', '모텔', '약물']);
    expect(tokens('김소영의 항소심')).toEqual(['김소영', '항소심']);
  });

  it('suggests a case when two distinctive words match', () => {
    expect(suggestCases("'강북 모텔 약물살인' 김소영 항소심 첫 공판", cases).map((c) => c.id)).toEqual(['a']);
    expect(suggestCases('김창민 감독 사망 사건 피고인 항소', cases).map((c) => c.id)).toEqual(['c']);
  });

  it('does not suggest on a single shared word', () => {
    expect(suggestCases('광주 도심 교통사고', cases)).toEqual([]);
  });
});
