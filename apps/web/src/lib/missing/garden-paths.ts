import type { MissingSummary } from "./types";

/**
 * 실종자들의 정원의 길은 나이가 아니라 자료에 담긴 사정으로 나눔.
 * 현재 API가 제공하는 공개 현재 실종 자료를 네 구역으로 나눔.
 */
export type GardenPathKey = "children" | "village" | "waiting" | "abroad";

export interface GardenPathMeta {
  key: GardenPathKey;
  name: string;
  mood: string;
  signTone: string;
}

export const GARDEN_PATHS: GardenPathMeta[] = [
  { key: "children", name: "아이들의 길", mood: "봄 들판과 노란 들꽃, 작은 바람개비", signTone: "#f1c85b" },
  { key: "village", name: "어른들의 길", mood: "실종된 성인과 어르신을 기다리는 한옥 마을, 돌아올 집의 온기", signTone: "#d98d66" },
  { key: "waiting", name: "오래 기다리는 길", mood: "실종된 지 10년, 20년이 지나도 계속 기억하며 기다리는 길", signTone: "#8b9f91" },
  { key: "abroad", name: "바다 건너 길", mood: "해외 공개 자료 속 분들을 기억하는 바닷길", signTone: "#77a8bf" },
];

const TEN_YEARS_MS = 10 * 365.25 * 24 * 60 * 60 * 1000;

/** 한 사람을 하나의 길에만 두어 같은 등불이 중복으로 보이지 않게 함 */
export function gardenPathOf(person: MissingSummary, now = Date.now()): GardenPathKey {
  const age = person.ageAtMissing;
  if (age !== null && age < 18) return "children";
  if (person.source === "FBI") return "abroad";
  if (person.missingDate && now - new Date(person.missingDate).getTime() >= TEN_YEARS_MS) return "waiting";
  return "village";
}

export type GardenGroups = Record<GardenPathKey, MissingSummary[]>;

export function groupByGarden(people: MissingSummary[], now = Date.now()): GardenGroups {
  const result: GardenGroups = { children: [], village: [], waiting: [], abroad: [] };
  for (const person of people) result[gardenPathOf(person, now)].push(person);
  return result;
}

export function gardenPathMeta(key: GardenPathKey): GardenPathMeta {
  return GARDEN_PATHS.find((path) => path.key === key) ?? GARDEN_PATHS[0];
}
