import type { MissingSummary } from "./types";

const US_STATES: Record<string, string> = {
  AL: "앨라배마", AK: "알래스카", AZ: "애리조나", AR: "아칸소", CA: "캘리포니아",
  CO: "콜로라도", CT: "코네티컷", DE: "델라웨어", DC: "워싱턴 D.C.", FL: "플로리다",
  GA: "조지아", HI: "하와이", ID: "아이다호", IL: "일리노이", IN: "인디애나",
  IA: "아이오와", KS: "캔자스", KY: "켄터키", LA: "루이지애나", ME: "메인",
  MD: "메릴랜드", MA: "매사추세츠", MI: "미시간", MN: "미네소타", MS: "미시시피",
  MO: "미주리", MT: "몬태나", NE: "네브래스카", NV: "네바다", NH: "뉴햄프셔",
  NJ: "뉴저지", NM: "뉴멕시코", NY: "뉴욕", NC: "노스캐롤라이나", ND: "노스다코타",
  OH: "오하이오", OK: "오클라호마", OR: "오리건", PA: "펜실베이니아", PR: "푸에르토리코",
  RI: "로드아일랜드", SC: "사우스캐롤라이나", SD: "사우스다코타", TN: "테네시",
  TX: "텍사스", UT: "유타", VT: "버몬트", VA: "버지니아", WA: "워싱턴",
  WV: "웨스트버지니아", WI: "위스콘신", WY: "와이오밍",
};

/** API의 지역 키(US:CA, US:FO:boston, KR:서울)를 화면 이름으로 바꿈 */
export function regionLabel(region: string): string {
  const [country, a, b] = region.split(":");
  if (country === "US") {
    if (a === "UNKNOWN") return "미국 · 지역 미상";
    if (a === "FO" && b) return `미국 · FBI ${b.charAt(0).toUpperCase()}${b.slice(1)} 지부`;
    // 예전 동기화 데이터는 "US-CA" 형태라 접두어를 떼고 찾음
    const code = a.replace(/^US-/, "");
    return `미국 · ${US_STATES[code] ?? code}`;
  }
  if (country === "KR") return `대한민국 · ${a}`;
  return region;
}

export interface RegionGroup {
  region: string;
  label: string;
  people: MissingSummary[];
}

/** 길 구간 순서: 사람이 많은 지역부터, 구간 안은 최근 실종자 순(API 정렬 유지) */
export function groupByRegion(people: MissingSummary[]): RegionGroup[] {
  const map = new Map<string, MissingSummary[]>();
  for (const p of people) {
    const list = map.get(p.region);
    if (list) list.push(p);
    else map.set(p.region, [p]);
  }
  return [...map.entries()]
    .map(([region, list]) => ({ region, label: regionLabel(region), people: list }))
    // 나라별로 묶은 뒤(대한민국 → 미국) 그 안에서 사람 많은 구간 순
    .sort(
      (x, y) =>
        countryRank(x.region) - countryRank(y.region) ||
        y.people.length - x.people.length ||
        x.label.localeCompare(y.label, "ko"),
    );
}

const COUNTRY_ORDER = ["KR", "US"];
function countryRank(region: string) {
  const i = COUNTRY_ORDER.indexOf(region.split(":")[0]);
  return i === -1 ? COUNTRY_ORDER.length : i;
}

/** 지역 메뉴의 나라 묶음 이름 */
export function countryLabel(region: string): string {
  const c = region.split(":")[0];
  return c === "KR" ? "대한민국" : c === "US" ? "미국" : c;
}

export function formatMissingDate(iso: string | null): string {
  if (!iso) return "날짜 미상";
  const d = new Date(iso);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}
