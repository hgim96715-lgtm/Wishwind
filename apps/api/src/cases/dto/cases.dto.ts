import { z } from 'zod';
import {
  CaseCategory,
  CaseStatus,
  Country,
} from '../../generated/prisma/enums.js';
import { CaseClosure } from '../closure.js';

/** 사건방 '관련 콘텐츠' 필터: 종류(영화·다큐·유튜브·도서) 또는 플랫폼(넷플릭스·프라임·디즈니+) */
export const RelatedFilter = {
  any: 'any',
  movie: 'movie',
  documentary: 'documentary',
  youtube: 'youtube',
  book: 'book',
  netflix: 'netflix',
  prime: 'prime',
  disney: 'disney',
} as const;

const DEFAULT_TAKE = 20;
const MAX_TAKE = 100;
const MAX_Q_LENGTH = 100;
const MIN_YEAR = 1800;
const MAX_YEAR = 2100;

/**
 * 쿼리스트링은 전부 string으로 들어오고, 빈 칸(`?country=`)은 '없음'으로 취급함.
 * 빠진 칸은 .optional()/.default()로 받아야 함 (zod v4는 transform 결과가 undefined인 필수 칸을 거부함).
 * 각 칸은 refine으로 안내 문장을 직접 적어 ZodPipe가 그대로 400 응답에 실어 보냄
 */
const blankToUndefined = (v: unknown) => (v === '' ? undefined : v);

function enumParam<T extends Record<string, string>>(name: string, values: T) {
  const allowed = Object.values(values);
  return z.preprocess(
    blankToUndefined,
    z
      .unknown()
      .refine(
        (v) => v === undefined || (typeof v === 'string' && allowed.includes(v)),
        `${name}는 ${allowed.join(', ')} 중 하나여야 합니다`,
      )
      .transform((v) => v as T[keyof T] | undefined),
  ).optional();
}

function yearParam(name: string) {
  return z.preprocess(
    blankToUndefined,
    z
      .unknown()
      .refine((v) => {
        if (v === undefined) return true;
        const year = Number(v);
        return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;
      }, `${name}는 ${MIN_YEAR}~${MAX_YEAR} 사이 연도여야 합니다`)
      .transform((v) => (v === undefined ? undefined : Number(v))),
  ).optional();
}

export const listCasesSchema = z
  .object({
    q: z
      .unknown()
      .refine((v) => v === undefined || typeof v === 'string', 'q는 문자열이어야 합니다')
      .transform((v) => (typeof v === 'string' ? v.trim() || undefined : undefined))
      .refine((v) => !v || v.length <= MAX_Q_LENGTH, `q는 ${MAX_Q_LENGTH}자 이하여야 합니다`)
      .optional(),
    country: enumParam('country', Country),
    category: enumParam('category', CaseCategory),
    status: enumParam('status', CaseStatus),
    // 판결 확정(VERDICT) / 수사 종결(CLOSED). 고르면 status는 SOLVED로 봄
    closure: enumParam('closure', CaseClosure),
    related: enumParam('related', RelatedFilter),
    yearFrom: yearParam('yearFrom'),
    yearTo: yearParam('yearTo'),
    cursor: z
      .unknown()
      .refine(
        (v) => v === undefined || z.uuid().safeParse(v).success,
        'cursor 형식이 올바르지 않습니다',
      )
      .transform((v) => v as string | undefined)
      .optional(),
    take: z
      .unknown()
      .refine((v) => {
        if (v === undefined) return true;
        const take = Number(v);
        return Number.isInteger(take) && take >= 1 && take <= MAX_TAKE;
      }, `take는 1~${MAX_TAKE} 사이 정수여야 합니다`)
      .transform((v) => (v === undefined ? DEFAULT_TAKE : Number(v)))
      .default(DEFAULT_TAKE),
  })
  .refine(
    ({ yearFrom, yearTo }) => !yearFrom || !yearTo || yearFrom <= yearTo,
    'yearFrom은 yearTo보다 클 수 없습니다',
  );

export type ListCasesQuery = z.output<typeof listCasesSchema>;
