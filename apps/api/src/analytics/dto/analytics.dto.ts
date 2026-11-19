import { z } from 'zod';

export const pageViewSchema = z.object({
  path: z.string().trim().startsWith('/').max(300),
  referrer: z.string().trim().max(500).optional(),
});
export type PageViewInput = z.infer<typeof pageViewSchema>;

export const statsQuerySchema = z.object({
  days: z.coerce.number().int().refine((d) => [7, 30, 90].includes(d)).default(30),
});
export type StatsQuery = z.infer<typeof statsQuerySchema>;
