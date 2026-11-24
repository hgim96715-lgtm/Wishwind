import type { MissingSource } from '../generated/prisma/enums.js';
import type { MissingDetailRow, MissingListRow } from './missing.repository.js';

/** 모든 카드에 붙이는 제보 창구: 찾기 목적에 맞게 실제 제보로 이어지게 함 */
export const TIP_LINKS: Record<MissingSource, { label: string; url: string }> = {
  FBI: { label: 'FBI에 제보하기', url: 'https://tips.fbi.gov' },
  SAFE182: { label: '182에 제보하기', url: 'https://www.safe182.go.kr' },
};

export const SOURCE_LABEL: Record<MissingSource, string> = {
  FBI: '미국 연방수사국(FBI)',
  SAFE182: '경찰청',
};

export function toMissingPage(rows: MissingListRow[], take: number) {
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return { items: items.map(({_count,...person})=>({...person,lightCount:_count.lightings})), nextCursor: hasMore ? items[items.length - 1].id : null };
}

export function toRegionCounts(rows: { region: string; _count: { _all: number } }[]) {
  return rows.map((r) => ({ region: r.region, count: r._count._all }));
}

/** 등불 클릭 시 펼쳐지는 카드: 출처 기관 이름과 제보 링크를 함께 내보냄 */
export function toMissingDetail(p: MissingDetailRow) {
  const {_count,...person}=p;
  return { ...person, lightCount:_count.lightings, sourceLabel: SOURCE_LABEL[p.source], tip: TIP_LINKS[p.source] };
}
