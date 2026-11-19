import { z } from 'zod';
import { SentenceVoteChoice, SentenceVoteDirection } from '../../generated/prisma/enums.js';

/** 👍(AGREE) / 👎(DISAGREE). 👎일 때만 "너무 가볍다/무겁다"를 함께 보낼 수 있음 */
export const castVoteSchema = z
  .object({
    choice: z.enum(SentenceVoteChoice),
    direction: z.enum(SentenceVoteDirection).optional(),
  })
  .refine((v) => v.direction === undefined || v.choice === SentenceVoteChoice.DISAGREE, {
    message: 'direction은 DISAGREE일 때만 보낼 수 있습니다',
  });
export type CastVoteInput = z.infer<typeof castVoteSchema>;
