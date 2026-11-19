import { z } from 'zod';
import { BriefingKind, BriefingStatus } from '../../generated/prisma/enums.js';

export const postSchema = z.object({
  kind: z.enum(BriefingKind),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
  isPinned: z.boolean().default(false),
  caseId: z.union([z.uuid(), z.literal(''), z.null()]).transform((v) => v || null).optional(),
  status: z.enum(BriefingStatus).default(BriefingStatus.DRAFT),
});
export type PostInput = z.infer<typeof postSchema>;

export const postPatchSchema = postSchema.partial();
export type PostPatch = z.infer<typeof postPatchSchema>;

export const postListSchema = z.object({
  kind: z.enum(BriefingKind).optional(),
  status: z.enum(BriefingStatus).optional(),
});
export type PostListQuery = z.infer<typeof postListSchema>;

export const opinionSchema = z.object({ caseId: z.uuid() });
export type OpinionRequest = z.infer<typeof opinionSchema>;
