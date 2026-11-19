import { z } from 'zod';

/** Papago Translation 응답에서 쓰는 부분만 검사 */
export const papagoResponseSchema = z.object({
  message: z.object({ result: z.object({ translatedText: z.string() }) }),
});
