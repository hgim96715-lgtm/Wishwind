import { z } from 'zod';
import { CourtLevel } from '../../generated/prisma/enums.js';

export const FACT_FIELDS = [
  'OCCURRED_AT',
  'SOLVED_AT',
  'CASE_STATUS',
  'SUSPECT_STATUS',
  'VERDICT',
  'PENALTY',
  'ADDITIONAL_ORDER',
  'APPEAL_OUTCOME',
  'DECIDED_AT',
  'VICTIM_COUNT',
  'DEATH_COUNT',
  'INJURED_COUNT',
  'LOCATION',
] as const;

export type FactField = (typeof FACT_FIELDS)[number];

/** 서로 다른 출처 2곳에서 일치해야 하는 핵심 사실 */
export const KEY_FIELDS: ReadonlySet<FactField> = new Set<FactField>([
  'OCCURRED_AT',
  'VERDICT',
  'PENALTY',
  'DECIDED_AT',
  'VICTIM_COUNT',
  'DEATH_COUNT',
  'INJURED_COUNT',
]);

export const extractionSchema = z.object({
  facts: z.array(
    z.object({
      field: z.enum(FACT_FIELDS),
      suspectRef: z.string().nullable(),
      courtLevel: z.enum(CourtLevel).nullable(),
      value: z.string(),
      normalizedValue: z.string(),
      sourceUrl: z.string(),
      quote: z.string(),
    }),
  ),
  people: z.array(
    z.object({
      name: z.string(),
      role: z.enum(['SUSPECT', 'VICTIM', 'OTHER']),
      protected: z.boolean(),
    }),
  ),
  notes: z.array(z.string()),
});

export type Extraction = z.infer<typeof extractionSchema>;
export type ExtractedFact = Extraction['facts'][number];
export type ExtractedPerson = Extraction['people'][number];

/** 출처 찾기(웹 검색) 결과 */
export const discoverySchema = z.object({
  sources: z.array(
    z.object({ url: z.string(), title: z.string(), publisher: z.string() }),
  ),
});

export type DiscoveredSource = z.infer<typeof discoverySchema>['sources'][number];
