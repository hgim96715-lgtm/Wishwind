import { Gender } from '../generated/prisma/enums.js';
import type { FbiMissingItem } from './schemas/fbi-missing.schema.js';
import {
  mapFbiItem,
  parseDateAndPlace,
  stripHtml,
  toRegion,
} from './fbi-missing.mapper.js';

const base: FbiMissingItem = {
  uid: 'abc123',
  title: 'JANE DOE ',
  url: 'https://www.fbi.gov/wanted/kidnap/jane-doe',
  poster_classification: 'missing',
};

describe('fbi-missing.mapper', () => {
  it('HTML 태그와 엔티티를 지움', () => {
    expect(stripHtml('<p>Last seen &amp; wearing<br/>a red coat</p>')).toBe(
      'Last seen & wearing\na red coat',
    );
    expect(stripHtml('')).toBeNull();
  });

  it('설명 첫 줄에서 날짜와 장소를 나눔', () => {
    const r = parseDateAndPlace('June 9, 2017 Albuquerque, New Mexico');
    expect(r.date?.toISOString()).toBe('2017-06-09T00:00:00.000Z');
    expect(r.place).toBe('Albuquerque, New Mexico');
    const two = parseDateAndPlace('October 14, 1996\r\nBelmont, California');
    expect(two.date?.toISOString()).toBe('1996-10-14T00:00:00.000Z');
    expect(two.place).toBe('Belmont, California');
    expect(parseDateAndPlace('Seattle, Washington')).toEqual({
      date: null,
      place: 'Seattle, Washington',
    });
  });

  it('지역은 주 → FBI 지부 → UNKNOWN 순', () => {
    expect(toRegion({ ...base, possible_states: ['ca'] })).toBe('US:CA');
    expect(toRegion({ ...base, possible_states: ['US-CA'] })).toBe('US:CA');
    expect(toRegion({ ...base, field_offices: ['LosAngeles'] })).toBe(
      'US:FO:losangeles',
    );
    expect(toRegion(base)).toBe('US:UNKNOWN');
  });

  it('항목을 저장 형태로 바꿈', () => {
    const m = mapFbiItem({
      ...base,
      sex: 'Female',
      hair: 'brown',
      height_min: 64,
      height_max: 66,
      description: '<p>March 3, 2019 Oakland, California</p>',
      images: [{ thumb: 't.jpg', large: 'l.jpg' }],
    });
    expect(m.name).toBe('JANE DOE');
    expect(m.gender).toBe(Gender.FEMALE);
    expect(m.lastSeenPlace).toBe('Oakland, California');
    expect(m.appearance).toBe(`머리색: brown\n키: 5'4" ~ 5'6"`);
    expect(m.photoUrl).toBe('l.jpg');
    expect(m.thumbUrl).toBe('t.jpg');
  });
});
