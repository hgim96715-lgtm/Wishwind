import { z } from 'zod';

const count = z.coerce.number().int().min(0).max(100_000_000);

const pct = z.coerce.number().min(0).max(100);
const optional = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.null(), z.literal('')]).optional().transform((v) => (v === '' || v === undefined ? null : v));

export const instagramPostSchema = z.object({
  postedOn: z.iso.date(),
  kind: z.enum(['STORY', 'FEED', 'REEL']),
  title: z.string().trim().min(1).max(200),
  caseSlug: z
    .union([z.string().trim().max(200), z.null()])
    .optional()
    .transform((v) => v || null),
  reach: count.default(0),
  likes: count.default(0),
  saves: count.default(0),
  shares: count.default(0),
  profileVisits: count.default(0),
  followsGained: count.default(0),
  note: z
    .union([z.string().trim().max(500), z.null()])
    .optional()
    .transform((v) => v || null),
  views: optional(count),
  viewers: optional(count),
  avgWatchSec: optional(z.coerce.number().min(0).max(3600)),
  durationSec: optional(z.coerce.number().int().min(0).max(3600)),
  skipRate: optional(pct),
  srcReels: optional(pct),
  srcExplore: optional(pct),
  srcProfile: optional(pct),
  srcFollow: optional(pct),
  retention: optional(z.array(z.object({ t: z.number().min(0).max(3600), p: pct })).max(60)),
});
export type InstagramPostInput = z.infer<typeof instagramPostSchema>;

export const featureSchema = z.object({ featured: z.boolean() });
