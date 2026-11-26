import { z } from 'zod';
import {
  CaseCategory,
  CaseReviewStatus,
  CaseStatus,
  ChangeKind,
  Country,
  DatePrecision,
  RelatedKind,
  SourceType,
} from '../../../generated/prisma/enums.js';

const dateOrNull = z
  .union([z.iso.date(), z.literal(''), z.null()])
  .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null));
const textOrNull = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).transform((v) => (v ? v : null));

/** 관리실에서 고칠 수 있는 기본 필드. 타임라인·가해자 등은 JSON import로 고침 */
export const caseEditSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    summary: z.string().trim().min(1).max(500),
    overview: textOrNull(20_000),
    victimCountNote: textOrNull(100),
    country: z.enum(Country),
    category: z.enum(CaseCategory),
    status: z.enum(CaseStatus),
    location: textOrNull(200),
    occurredAt: dateOrNull,
    occurredAtPrecision: z.enum(DatePrecision),
    solvedAt: dateOrNull,
  })
  .partial();
export type CaseEdit = z.infer<typeof caseEditSchema>;

export const caseListSchema = z.object({
  q: z.string().trim().max(100).optional(),
  review: z.enum(CaseReviewStatus).optional(),
  published: z.enum(['true', 'false']).optional(),
});
export type CaseListQuery = z.infer<typeof caseListSchema>;

export const reviewSchema = z.object({
  status: z.enum(CaseReviewStatus),
  note: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || undefined),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const publishSchema = z.object({ published: z.boolean() });
export type PublishInput = z.infer<typeof publishSchema>;

/** 관리실에서 출처 한 곳 추가. JSON 가져오기의 출처 형식과 같음 */
export const sourceAddSchema = z.object({
  url: z.url({ protocol: /^https?$/ }).max(1000),
  title: z.string().trim().min(1).max(300),
  publisher: z.string().trim().min(1).max(200),
  type: z.enum(SourceType).default(SourceType.NEWS),
  publishedAt: dateOrNull.optional(),
});
export type SourceAdd = z.infer<typeof sourceAddSchema>;

/** 위키는 '더 보기' 링크로 넣지 않음 (JSON 가져오기 규칙과 같음) */
const notWiki = (url: string) => !/(^|\.)(namu\.(wiki|moe)|wikipedia\.org)$/i.test(new URL(url).hostname);
const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((v) => (v ? v : null));

/** 관련 콘텐츠(다큐·방송·유튜브·영화 등) 하나. 사실의 출처가 아니라 '더 보기' 링크라 검토 상태에 영향 없음 */
const relatedFields = {
  kind: z.enum(RelatedKind),
  title: z.string().trim().min(1).max(300),
  platform: z.string().trim().min(1).max(100),
  creator: optionalText(200),
  url: z
    .url({ protocol: /^https$/ })
    .max(1000)
    .refine(notWiki, '위키는 관련 콘텐츠로 넣지 않습니다'),
  releaseYear: z
    .union([z.coerce.number().int().min(1900).max(2100), z.literal(''), z.null()])
    .optional()
    .transform((v) => (typeof v === 'number' ? v : null)),
  language: z.string().trim().regex(/^[a-z]{2}$/).default('ko'),
  note: optionalText(300),
  isDramatized: z.boolean().default(false),
};
export const relatedAddSchema = z.object(relatedFields).refine((v) => !v.isDramatized || !!v.note, {
  message: '각색 작품은 메모에 "사건을 모티브로 한 극영화"처럼 적어 주세요',
  path: ['note'],
});
/** 추가와 고치기 모두 칸 전체를 보냄 (고치기는 통째로 바꿈) */
export type RelatedAdd = z.infer<typeof relatedAddSchema>;

/** 사건이 바꾼 것(법·기념일·제도) 하나. 추가와 고치기 모두 칸 전체를 보냄 */
export const changeAddSchema = z
  .object({
    kind: z.enum(ChangeKind),
    name: z.string().trim().min(1).max(200),
    year: z
      .union([z.coerce.number().int().min(1800).max(2100), z.literal(''), z.null()])
      .optional()
      .transform((v) => (typeof v === 'number' ? v : null)),
    observedOn: z
      .union([z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, '날짜는 MM-DD 형식입니다 (예: 12-06)'), z.literal(''), z.null()])
      .optional()
      .transform((v) => (v ? v : null)),
    country: z
      .union([z.enum(Country), z.literal(''), z.null()])
      .optional()
      .transform((v) => (v ? v : null)),
    description: z.string().trim().min(1).max(500),
    sourceUrl: z
      .url({ protocol: /^https?$/ })
      .max(1000)
      .refine(notWiki, '위키는 출처로 쓸 수 없습니다'),
    sourceTitle: z.string().trim().min(1).max(300),
  })
  .refine((v) => v.kind !== ChangeKind.DAY || !!v.observedOn, { message: '기념일은 매년 돌아오는 날(MM-DD)을 적어 주세요', path: ['observedOn'] });
export type ChangeAdd = z.infer<typeof changeAddSchema>;

/** 타임라인 한 줄. 추가와 고치기 모두 칸 전체를 보냄 */
export const timelineAddSchema = z.object({
  occurredAt: dateOrNull.optional().transform((v) => v ?? null),
  occurredAtPrecision: z.enum(DatePrecision),
  title: z.string().trim().min(1).max(200),
  description: textOrNull(5000).optional().transform((v) => v ?? null),
});
export type TimelineAdd = z.infer<typeof timelineAddSchema>;

export const filePickSchema = z.object({ picked: z.boolean() });
export type FilePickInput = z.infer<typeof filePickSchema>;
