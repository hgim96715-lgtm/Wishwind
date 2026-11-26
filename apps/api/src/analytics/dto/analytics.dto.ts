import { z } from 'zod';

export const pageViewSchema = z.object({
  path: z.string().trim().startsWith('/').max(300),
  referrer: z.string().trim().max(500).optional(),
  /** 링크에 붙인 ?utm_source=값 (인스타 프로필 링크처럼 출처가 안 남는 곳을 구분) */
  source: z.string().trim().regex(/^[a-z0-9_-]{1,30}$/i).optional(),
});
export type PageViewInput = z.infer<typeof pageViewSchema>;

export const statsQuerySchema = z.object({
  days: z.coerce.number().int().refine((d) => [7, 30, 90].includes(d)).default(30),
});
export type StatsQuery = z.infer<typeof statsQuerySchema>;
