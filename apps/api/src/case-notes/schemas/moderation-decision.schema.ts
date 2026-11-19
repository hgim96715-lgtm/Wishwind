import { z } from 'zod';

const CATEGORIES = [
  'NONE',
  'ACCUSATION',
  'VICTIM_HARM',
  'PERSONAL_INFO',
  'ABUSE',
  'UNVERIFIED_CLAIM',
  'SPAM',
  'OTHER',
] as const;

/** AI 글 검사가 돌려주는 판정 (structured output) */
export const decisionSchema = z.object({
  verdict: z.enum(['ALLOW', 'BLOCK', 'HOLD']),
  category: z.enum(CATEGORIES),
  reasonKo: z.string(),
});
