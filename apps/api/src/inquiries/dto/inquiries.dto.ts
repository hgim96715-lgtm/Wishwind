import { z } from 'zod';
import { InquiryKind, InquiryStatus } from '../../generated/prisma/enums.js';

export const inquirySchema = z.object({
  kind: z.enum(InquiryKind),
  body: z.string().trim().min(5).max(2000),
  caseSlug: z
    .string()
    .trim()
    .max(200)
    .regex(/^[a-z0-9-]*$/)
    .optional()
    .transform((v) => v || undefined),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

/** 보낸 글 고치기 (관리자가 보기 전까지) */
export const inquiryEditSchema = z.object({ body: z.string().trim().min(5).max(2000) });
export type InquiryEditInput = z.infer<typeof inquiryEditSchema>;

export const inquiryListSchema = z.object({
  group: z.enum(['inquiry', 'feedback']).default('inquiry'),
  status: z.enum(InquiryStatus).optional(),
});
export type InquiryListQuery = z.infer<typeof inquiryListSchema>;

export const replySchema = z.object({ reply: z.string().trim().min(1).max(5000) });
export type ReplyInput = z.infer<typeof replySchema>;

export const inquiryStatusSchema = z.object({ status: z.enum(InquiryStatus) });
export type InquiryStatusInput = z.infer<typeof inquiryStatusSchema>;
