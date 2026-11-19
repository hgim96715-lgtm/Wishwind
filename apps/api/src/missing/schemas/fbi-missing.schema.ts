import { z } from 'zod';

/** FBI Wanted API 응답 형식 (https://api.fbi.gov/wanted/v1/list) */
const fbiImageSchema = z.object({
  original: z.string().nullish(),
  large: z.string().nullish(),
  thumb: z.string().nullish(),
  caption: z.string().nullish(),
});

export const fbiItemSchema = z.object({
  uid: z.string(),
  title: z.string(),
  url: z.string(),
  description: z.string().nullish(),
  details: z.string().nullish(),
  remarks: z.string().nullish(),
  sex: z.string().nullish(),
  race: z.string().nullish(),
  race_raw: z.string().nullish(),
  hair: z.string().nullish(),
  hair_raw: z.string().nullish(),
  eyes: z.string().nullish(),
  eyes_raw: z.string().nullish(),
  height_min: z.number().nullish(),
  height_max: z.number().nullish(),
  weight: z.string().nullish(),
  age_range: z.string().nullish(),
  age_min: z.number().nullish(),
  scars_and_marks: z.string().nullish(),
  possible_states: z.array(z.string()).nullish(),
  field_offices: z.array(z.string()).nullish(),
  poster_classification: z.string().nullish(),
  modified: z.string().nullish(),
  images: z.array(fbiImageSchema).nullish(),
});

export const fbiListSchema = z.object({
  total: z.number(),
  items: z.array(z.unknown()),
});

export type FbiMissingItem = z.infer<typeof fbiItemSchema>;
