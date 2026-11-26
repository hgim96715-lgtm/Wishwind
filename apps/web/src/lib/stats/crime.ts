/**
 * 공식 통계 원본 (지표누리 엑셀 내려받기, 2026-11-26 확인). 숫자는 원본 그대로이고 가공하지 않음.
 * 해마다 새 값이 나오면 이 파일의 배열 끝에 한 해씩 더하고 CHECKED_ON을 고침.
 * 각 배열은 [연도, 값] 쌍이고 값이 없는 해(-)는 아예 넣지 않음.
 */
import policeData from "./police-counts.json";

export type Point = readonly [year: number, value: number];

export const CHECKED_ON = "2026-11-26";

const zip = (years: readonly number[], values: readonly number[]): Point[] => years.map((y, i) => [y, values[i]] as const);

const Y2013_2024 = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024] as const;

/** 형법범죄율: 인구 10만 명당 발생건수. 출처: 검찰청 「범죄분석」, 국가데이터처 「장래인구추계(2022년 기준)」 */
export const CRIME_RATE = [
  { id: "all", label: "전체 형법범죄", points: zip(Y2013_2024, [2098, 2003, 2054, 1964, 1867, 1916, 2012, 2015, 1773, 1943, 1986, 2118]) },
  { id: "murder", label: "살인", points: zip(Y2013_2024, [1.9, 1.8, 1.9, 1.9, 1.7, 1.6, 1.6, 1.6, 1.3, 1.4, 1.5, 1.6]) },
  { id: "robbery", label: "강도", points: zip(Y2013_2024, [4.0, 3.2, 2.9, 2.3, 1.9, 1.6, 1.6, 1.3, 1.0, 1.0, 1.2, 0.9]) },
  { id: "sexual", label: "성폭력", points: zip(Y2013_2024, [53.4, 58.8, 60.9, 57.3, 63.9, 62.2, 61.9, 58.1, 63.5, 80.2, 74.8, 69.9]) },
  { id: "assault", label: "폭행", points: zip(Y2013_2024, [250.9, 288.9, 316.8, 336.0, 322.2, 318.9, 312.8, 277.0, 230.9, 250.2, 238.1, 229.5]) },
  { id: "theft", label: "절도", points: zip(Y2013_2024, [576.7, 525.7, 483.0, 397.5, 358.9, 344.0, 362.5, 347.4, 322.2, 353.6, 367.3, 355.8]) },
] as const;

export const CRIME_NOTES: Record<string, string> = {
  sexual: "2002년부터 강간에 성폭력범이 포함되었고, 2014년부터 분류명이 '성폭력'으로 바뀌었습니다. 신고가 늘어난 영향도 있을 수 있어 숫자가 늘었다고 해서 범죄가 그만큼 늘었다고 단정할 수 없습니다.",
};

export const CRIME_SOURCE = "검찰청 「범죄분석」, 국가데이터처 「장래인구추계(2022년 기준)」 · 지표누리 '형법범죄율'";

/** 경찰청 5대 범죄 발생건수 (`pnpm stats:police`가 공공데이터포털 OpenAPI에서 받아 저장). 인구로 나누지 않은 건수라 인구 변화는 반영되지 않음 */
const POLICE_ORDER = [
  ["murder", "살인"],
  ["robbery", "강도"],
  ["sexual", "강간·강제추행"],
  ["theft", "절도"],
  ["violence", "폭력"],
] as const;

export const POLICE_COUNTS = POLICE_ORDER.flatMap(([id, label]) => {
  const row = policeData.rows.find((r) => r.label === label);
  if (!row) return [];
  const points: Point[] = Object.entries(row.values)
    .map(([year, value]) => [Number(year), value] as const)
    .sort((a, b) => a[0] - b[0]);
  return [{ id, label, points }];
});

export const POLICE_CHECKED_ON = policeData.fetchedAt;

export const POLICE_SOURCE = "경찰청 「5대 범죄 발생건수」(공공데이터포털)";

const Y2004_2025 = [2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] as const;

/** 재범률과 재복역률 (%). 출처: 법무부 「보호관찰통계」·「내부행정통계」, 법무연수원 「범죄백서」 */
export const RECIDIVISM = [
  {
    id: "release",
    label: "출소자 재복역률",
    color: "var(--color-steel-ink)",
    help: "4년 전 출소한 사람 중 3년 안에 다시 교도소에 들어간 사람의 비율",
    points: zip(Y2004_2025.slice(2, 21), [24.3, 23.1, 22.7, 22.4, 22.5, 22.3, 22.2, 22.2, 22.1, 21.4, 24.8, 24.7, 25.7, 26.6, 25.2, 24.6, 23.8, 22.5, 22.6]),
  },
  {
    id: "juvenile",
    label: "소년원 재입원율",
    color: "var(--color-brand-fg)",
    help: "소년원에서 나온 소년 중 3년 안에 다시 소년원에 들어온 비율",
    points: zip(Y2004_2025.slice(10, 21), [24.3, 19.5, 18.6, 18.4, 21.2, 21.6, 19.1, 18.0, 17.9, 16.6, 15.7]),
  },
  {
    id: "probation",
    label: "보호관찰 대상자 재범률",
    color: "var(--color-jade-ink)",
    help: "그해 보호관찰을 받은 사람 중 다시 범죄를 저질러 처분을 받은 사람의 비율",
    points: zip(Y2004_2025, [8.1, 7.5, 5.8, 6.4, 6.5, 7.6, 7.2, 7.6, 7.9, 7.6, 7.4, 7.6, 7.9, 7.8, 7.2, 7.2, 7.3, 6.4, 6.0, 6.7, 6.4, 6.2]),
  },
  {
    id: "hospital",
    label: "국립법무병원 재입소율",
    color: "var(--color-clay-ink)",
    help: "치료감호를 받고 나온 사람 중 3년 안에 다시 입소한 비율",
    points: zip(Y2004_2025.slice(7, 21), [17.9, 19.1, 16.4, 10.5, 14.6, 8.4, 9.3, 6.1, 3.3, 2.5, 2.8, 4.3, 2.6, 4.6]),
  },
] as const;

export const RECIDIVISM_SOURCE = "법무부 「보호관찰통계」·「내부행정통계」, 법무연수원 「범죄백서」 · 지표누리 '재범률과 재복역률'";
