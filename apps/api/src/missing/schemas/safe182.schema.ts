import { z } from 'zod';

/** 공공 API가 같은 칸을 문자열/숫자로 섞어 줌 → 문자열로 통일, 빈 값은 null */
const text = z.union([z.string(), z.number()]).nullish().transform((v) => (v == null ? null : String(v).trim() || null));

export const safe182ItemSchema = z.object({
  msspsnIdntfccd: text,
  nm: z.string(),
  occrde: text,
  occrAdres: text,
  sexdstnDscd: text,
  age: text,
  ageNow: text,
  writngTrgetDscd: text,
  alldressingDscd: text,
  height: text,
  bdwgh: text,
  frmDscd: text,
  faceshpeDscd: text,
  hairshpeDscd: text,
  haircolrDscd: text,
  etcSpfeatr: text,
  tknphotolength: text,
});

export const safe182ListSchema = z.object({
  result: z.union([z.string(), z.number()]).transform(String),
  msg: z.string().nullish(),
  totalCount: z.coerce.number().nullish(),
  list: z.array(z.unknown()).nullish(),
});

export type Safe182Item = z.infer<typeof safe182ItemSchema>;
