import { filterCloud } from './cloud-filter.js';

describe('filterCloud', () => {
  it('응원 메시지는 통과', () => {
    expect(filterCloud('무사히 가족 품으로 돌아오길 바랍니다').ok).toBe(true);
    expect(filterCloud('당신을 기억하는 사람들이 여기 있어요').ok).toBe(true);
  });
  it('목격 제보는 공식 창구로 안내', () => {
    const r = filterCloud('어제 망우역 근처에서 봤어요');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.category).toBe('SIGHTING');
  });
  it('죽음을 단정하는 표현은 막음', () => {
    const r = filterCloud('편히 쉬세요');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.category).toBe('DEATH');
  });
});
