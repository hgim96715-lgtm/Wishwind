import { z } from 'zod';

const CLOUD_MESSAGE = '메시지는 2~100자로 남겨 주세요.';

export const cloudSchema = z.object({
  body: z
    .unknown()
    .refine((v) => typeof v === 'string', CLOUD_MESSAGE)
    .transform((v) => (v as string).trim())
    .refine((v) => v.length >= 2 && v.length <= 100, CLOUD_MESSAGE),
});

export type CloudInput = z.output<typeof cloudSchema>;
