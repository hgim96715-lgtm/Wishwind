import { z } from 'zod';

/** URL의 :type/:key. 사건은 slug, 실종자는 uuid */
export const fileTargetSchema = z
  .object({
    type: z.enum(['case', 'missing']),
    key: z.string().trim().min(1).max(100),
  })
  .refine((t) => (t.type === 'case' ? /^[a-z0-9-]+$/.test(t.key) : z.uuid().safeParse(t.key).success), {
    message: '잘못된 파일 주소입니다.',
  });
export type FileTargetParams = z.infer<typeof fileTargetSchema>;

export const fileEventSchema = z.object({
  kind: z.enum(['VIEW', 'SHARE']),
  /** 공유 방법: 링크 복사, 휴대폰 공유 창, 스토리 전단지 저장 */
  channel: z.enum(['link', 'native', 'flyer']).optional(),
});
export type FileEventInput = z.infer<typeof fileEventSchema>;
