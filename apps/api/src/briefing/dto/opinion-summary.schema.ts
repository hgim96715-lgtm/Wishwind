import { z } from 'zod';

/** Claude가 돌려주는 의견 요약 초안의 모양 */
export const opinionSummarySchema = z.object({
  title: z.string(),
  body: z.string(),
});
export type OpinionSummary = z.infer<typeof opinionSummarySchema>;
