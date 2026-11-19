import { z } from 'zod';

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;
/** 국가:시도(:시군구). 예: US:CA, KR:서울특별시:강남구 */
const REGION_RE = /^[A-Z]{2}(:[\p{L}\p{N}_-]{1,60}){1,2}$/u;

const isUuid = (v: unknown) => z.uuid().safeParse(v).success;

export const listMissingSchema = z.object({
  region: z
    .unknown()
    .refine(
      (v) => v === undefined || (typeof v === 'string' && REGION_RE.test(v)),
      'region 형식이 올바르지 않습니다 (예: US:CA)',
    )
    .transform((v) => v as string | undefined)
    .optional(),
  source: z
    .unknown()
    .refine(
      (v) => v === undefined || v === 'FBI' || v === 'SAFE182',
      'source는 FBI 또는 SAFE182여야 합니다',
    )
    .transform((v) => v as 'FBI' | 'SAFE182' | undefined)
    .optional(),
  cursor: z
    .unknown()
    .refine((v) => v === undefined || isUuid(v), 'cursor 형식이 올바르지 않습니다')
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
});

export type ListMissingQuery = z.output<typeof listMissingSchema>;

/** `@Param('id', new ZodPipe(missingIdSchema))` */
export const missingIdSchema = z
  .string()
  .refine(isUuid, 'id 형식이 올바르지 않습니다');
