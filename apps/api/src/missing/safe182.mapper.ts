import { createHash } from 'node:crypto';
import { Gender } from '../generated/prisma/enums.js';
import type { MissingPersonInput } from './fbi-missing.mapper.js';
import type { Safe182Item } from './schemas/safe182.schema.js';

const SIDO: [RegExp, string][] = [
  [/^서울/, '서울'], [/^부산/, '부산'], [/^대구/, '대구'], [/^인천/, '인천'],
  [/^광주/, '광주'], [/^대전/, '대전'], [/^울산/, '울산'], [/^세종/, '세종'],
  [/^경기/, '경기'], [/^강원/, '강원'],
  [/^(충북|충청북)/, '충북'], [/^(충남|충청남)/, '충남'],
  [/^(전북|전라북|전북특별)/, '전북'], [/^(전남|전라남)/, '전남'],
  [/^(경북|경상북)/, '경북'], [/^(경남|경상남)/, '경남'], [/^제주/, '제주'],
];

/** "서울시 성북구 정릉동" → KR:서울 */
export function toKrRegion(address: string | null): string {
  const first = address?.trim().split(/\s+/)[0] ?? '';
  const hit = SIDO.find(([re]) => re.test(first));
  return `KR:${hit ? hit[1] : '미상'}`;
}

/** YYYYMMDD → Date(UTC). 형식이 틀리면 null */
export function parseYmd(v: string | null): Date | null {
  const m = v?.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toInt(v: string | null): number | null {
  const n = v == null ? NaN : Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function toGender(v: string | null): Gender {
  if (v === '여자' || v === '2') return Gender.FEMALE;
  if (v === '남자' || v === '1') return Gender.MALE;
  return Gender.UNKNOWN;
}

const known = (v: string | null) => (v && v !== '불상' && v !== '기타' ? v : null);

function buildAppearance(i: Safe182Item): string | null {
  const lines = [
    i.height && toInt(i.height) ? `키: ${i.height}cm` : null,
    i.bdwgh && toInt(i.bdwgh) ? `몸무게: ${i.bdwgh}kg` : null,
    known(i.frmDscd) && `체격: ${i.frmDscd}`,
    known(i.faceshpeDscd) && `얼굴형: ${i.faceshpeDscd}`,
    known(i.hairshpeDscd) && `머리 모양: ${i.hairshpeDscd}`,
    known(i.haircolrDscd) && `머리색: ${i.haircolrDscd}`,
    known(i.alldressingDscd) && `옷차림: ${i.alldressingDscd}`,
    i.etcSpfeatr && `신체 특징: ${i.etcSpfeatr}`,
  ].filter((l): l is string => !!l);
  return lines.length ? lines.join('\n') : null;
}

/**
 * 식별코드(msspsnIdntfccd)가 있으면 그것을, 없으면 변하지 않는 값들의 해시를 외부 ID로 씀.
 * 사진 주소 형식은 공식 문서에 없어 실제 응답으로 확인이 필요함 (아래 imgView 주소는 확인 전 추정)
 */
export function mapSafe182Item(i: Safe182Item): MissingPersonInput {
  const externalId =
    i.msspsnIdntfccd ??
    createHash('sha1').update([i.nm, i.occrde, i.occrAdres, i.age, i.sexdstnDscd].join('|')).digest('hex');
  const hasPhoto = !!i.msspsnIdntfccd && (toInt(i.tknphotolength) ?? 0) > 0;
  const photo = hasPhoto
    ? `https://www.safe182.go.kr/api/lcm/imgView.do?msspsnIdntfccd=${encodeURIComponent(i.msspsnIdntfccd!)}`
    : null;

  return {
    externalId,
    name: i.nm.trim(),
    gender: toGender(i.sexdstnDscd),
    ageAtMissing: toInt(i.age),
    ageNow: toInt(i.ageNow),
    missingDate: parseYmd(i.occrde),
    lastSeenPlace: i.occrAdres,
    region: toKrRegion(i.occrAdres),
    appearance: buildAppearance(i),
    description: null,
    photoUrl: photo,
    thumbUrl: photo,
    sourceUrl: i.msspsnIdntfccd
      ? `https://www.safe182.go.kr/home/lcm/lcmMssGet.do?gnbMenuCd=014000000000&lnbMenuCd=014001000000&rptDscd=2&msspsnIdntfccd=${encodeURIComponent(i.msspsnIdntfccd)}`
      : 'https://www.safe182.go.kr',
    sourceModified: null,
  };
}
