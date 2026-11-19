import { Gender } from '../generated/prisma/enums.js';
import type { FbiMissingItem } from './schemas/fbi-missing.schema.js';

export interface MissingPersonInput {
  externalId: string;
  name: string;
  gender: Gender;
  ageAtMissing?: number | null;
  ageNow?: number | null;
  missingDate: Date | null;
  lastSeenPlace: string | null;
  region: string;
  appearance: string | null;
  description: string | null;
  photoUrl: string | null;
  thumbUrl: string | null;
  sourceUrl: string;
  sourceModified: Date | null;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/** FBI 본문은 HTML 조각이라 태그를 지우고 공백을 정리함 (화면에는 텍스트로만 렌더링) */
export function stripHtml(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
  return text || null;
}

/**
 * FBI description은 보통 "October 14, 1996\r\nBelmont, California"처럼 날짜 줄 + 장소 줄.
 * 한 줄에 붙어 오는 경우("June 9, 2017 Albuquerque, New Mexico")도 처리함. 형식이 다르면 날짜 없이 원문을 장소로 둠
 */
export function parseDateAndPlace(description: string | null): {
  date: Date | null;
  place: string | null;
} {
  if (!description) return { date: null, place: null };
  const lines = description.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { date: null, place: null };
  const m = lines[0].match(/^([A-Z][a-z]+ \d{1,2}, \d{4})\s*[-–,]?\s*(.*)$/);
  if (!m) return { date: null, place: lines.join(', ') };
  const parsed = new Date(`${m[1]} 00:00:00 UTC`);
  const date = Number.isNaN(parsed.getTime()) ? null : parsed;
  const place = [m[2].trim(), ...lines.slice(1)].filter(Boolean).join(', ');
  return { date, place: place || null };
}

function toGender(sex: string | null | undefined): Gender {
  const v = sex?.toLowerCase();
  if (v === 'male') return Gender.MALE;
  if (v === 'female') return Gender.FEMALE;
  return Gender.UNKNOWN;
}

function inchesToFeet(inches: number): string {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function buildAppearance(item: FbiMissingItem): string | null {
  const lines: string[] = [];
  const race = item.race ?? item.race_raw;
  const hair = item.hair ?? item.hair_raw;
  const eyes = item.eyes ?? item.eyes_raw;
  if (race) lines.push(`인종: ${race}`);
  if (hair) lines.push(`머리색: ${hair}`);
  if (eyes) lines.push(`눈동자: ${eyes}`);
  if (item.height_min) {
    const max = item.height_max && item.height_max !== item.height_min;
    lines.push(
      `키: ${inchesToFeet(item.height_min)}${max ? ` ~ ${inchesToFeet(item.height_max!)}` : ''}`,
    );
  }
  if (item.weight) lines.push(`몸무게: ${item.weight}`);
  if (item.scars_and_marks) lines.push(`특징: ${item.scars_and_marks}`);
  return lines.length ? lines.join('\n') : null;
}

/** 지역 구간 키. 화면에서 라벨로 바꿈: US:CA(주), US:FO:<지부>, US:UNKNOWN */
export function toRegion(item: FbiMissingItem): string {
  const state = item.possible_states?.find((s) => s.trim());
  // FBI는 주를 "US-CA" 형태로 줌 → 앞의 "US-"를 떼어 US:CA로 통일
  if (state) return `US:${state.trim().toUpperCase().replace(/^US-/, '')}`;
  const office = item.field_offices?.find((s) => s.trim());
  if (office) return `US:FO:${office.trim().toLowerCase()}`;
  return 'US:UNKNOWN';
}

export function mapFbiItem(item: FbiMissingItem): MissingPersonInput {
  const description = stripHtml(item.description);
  const { date, place } = parseDateAndPlace(description);
  const details = [stripHtml(item.details), stripHtml(item.remarks)]
    .filter(Boolean)
    .join('\n');
  const image = item.images?.find((i) => i.large || i.original || i.thumb);
  const modified = item.modified ? new Date(item.modified) : null;

  return {
    externalId: item.uid,
    name: item.title.trim(),
    gender: toGender(item.sex),
    missingDate: date,
    lastSeenPlace: place,
    region: toRegion(item),
    appearance: buildAppearance(item),
    description: details || null,
    photoUrl: image?.large ?? image?.original ?? null,
    thumbUrl: image?.thumb ?? null,
    sourceUrl: item.url,
    sourceModified:
      modified && !Number.isNaN(modified.getTime()) ? modified : null,
  };
}
