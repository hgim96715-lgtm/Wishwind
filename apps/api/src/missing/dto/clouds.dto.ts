import { z } from 'zod';

const CLOUD_MESSAGE = '메시지는 2~100자로 남겨 주세요.';

export const cloudSchema = z.object({
  body: z
    .unknown()
    .refine((v) => typeof v === 'string', CLOUD_MESSAGE)
    .transform((v) => (v as string).trim())
    .refine((v) => v.length >= 2 && v.length <= 100, CLOUD_MESSAGE),
  /** 정원 캐릭터 닉네임(2~10자). 없거나 비면 "누군가"로 보임 */
  nickname: z
    .string()
    .trim()
    .max(10)
    .optional()
    .transform((v) => (v && v.length >= 2 ? v : undefined)),
  /** 바람개비를 꽂은 자리 (언덕 좌표). 없으면 정원 안 자리에 차례로 꽂힘 */
  position: z
    .object({
      x: z.number().finite().min(-100).max(100),
      z: z.number().finite().min(-20000).max(60),
    })
    .optional(),
});

export type CloudInput = z.output<typeof cloudSchema>;
