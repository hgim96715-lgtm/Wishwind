import { Gender } from '../generated/prisma/enums.js';
import { mapSafe182Item, parseYmd, toKrRegion } from './safe182.mapper.js';

describe('safe182.mapper', () => {
  it('발생 장소 첫 단어를 시·도 구간으로 바꿈', () => {
    expect(toKrRegion('서울시 성북구 정릉동')).toBe('KR:서울');
    expect(toKrRegion('경상남도 창원시')).toBe('KR:경남');
    expect(toKrRegion(null)).toBe('KR:미상');
  });

  it('YYYYMMDD를 날짜로 바꿈', () => {
    expect(parseYmd('20120916')?.toISOString()).toBe('2012-09-16T00:00:00.000Z');
    expect(parseYmd('불상')).toBeNull();
  });

  it('항목을 저장 형태로 바꾸고 불상 값은 빼고 인상착의를 만듦', () => {
    const m = mapSafe182Item({
      msspsnIdntfccd: '123',
      nm: '홍길동',
      occrde: '20120916',
      occrAdres: '서울시 성북구 정릉동',
      sexdstnDscd: '여자',
      age: '18',
      ageNow: '21',
      writngTrgetDscd: '010',
      alldressingDscd: '불상',
      height: '160',
      bdwgh: '45',
      frmDscd: '보통',
      faceshpeDscd: '계란형',
      hairshpeDscd: null,
      haircolrDscd: '흑색',
      etcSpfeatr: null,
      tknphotolength: '0',
    });
    expect(m.gender).toBe(Gender.FEMALE);
    expect(m.ageAtMissing).toBe(18);
    expect(m.region).toBe('KR:서울');
    expect(m.appearance).toBe('키: 160cm\n몸무게: 45kg\n체격: 보통\n얼굴형: 계란형\n머리색: 흑색');
    expect(m.photoUrl).toBeNull();
    expect(m.externalId).toBe('123');
  });
});
