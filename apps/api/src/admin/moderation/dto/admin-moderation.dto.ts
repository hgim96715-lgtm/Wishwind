import { z } from 'zod';

export const moderationListSchema = z.object({
  filter: z.enum(['held', 'blocked', 'hidden', 'reported', 'all']).default('held'),
  type: z.enum(['all', 'answer', 'question', 'cloud']).default('all'),
});
export type ModerationListQuery = z.infer<typeof moderationListSchema>;

export const moderationActionSchema = z.object({
  /** dismiss: 신고 기각 (신고 기록을 지우고 공개로 둠). 신고 기능이 있는 답변·질문만 */
  action: z.enum(['publish', 'hide', 'block', 'dismiss']),
});
export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
export type ModerationAction = ModerationActionInput['action'];

export const contentTypeSchema = z.enum(['answer', 'question', 'cloud']);
export type ContentType = z.infer<typeof contentTypeSchema>;

export const blockSchema = z.object({ reason: z.string().trim().max(300).optional() });
export type BlockInput = z.infer<typeof blockSchema>;
