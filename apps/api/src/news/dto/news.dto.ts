import { z } from 'zod';
import { CaseCategory, NewsStatus } from '../../generated/prisma/enums.js';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

export const newsListSchema = z.object({
  status: z.enum(NewsStatus).default(NewsStatus.NEW),
  scope: z.enum(['kr', 'foreign']).default('kr'),
});
export type NewsListQuery = z.infer<typeof newsListSchema>;

export const newsActionSchema = z.object({
  status: z.enum(NewsStatus),
  titleKo: optionalText(300),
  caseId: z.union([z.uuid(), z.literal(''), z.null()]).transform((v) => v || null).optional(),
  /** 사건에 연결할 때 타임라인에 넣을 제목. 비우면 기사 제목 */
  timelineTitle: optionalText(200),
});
export type NewsAction = z.infer<typeof newsActionSchema>;

export const newsCaseSchema = z.object({
  title: z.string().trim().min(2).max(200),
  summary: z.string().trim().min(10).max(500),
  category: z.enum(CaseCategory),
  location: optionalText(200),
  timelineTitle: optionalText(200),
});
export type NewsCaseInput = z.infer<typeof newsCaseSchema>;
