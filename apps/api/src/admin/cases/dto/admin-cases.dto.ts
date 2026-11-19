import { z } from 'zod';
import {
  CaseCategory,
  CaseReviewStatus,
  CaseStatus,
  Country,
  DatePrecision,
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
