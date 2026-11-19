import { Country, DatePrecision, SourceType } from '../generated/prisma/enums.js';
import { suggestCases, type CaseCandidate } from './case-match.js';
import type { NewsRow } from './news.repository.js';

const REGION_COUNTRY: Record<string, Country> = {
  KR: Country.KR,
  US: Country.US,
  GB: Country.GB,
  JP: Country.JP,
  CN: Country.CN,
};

export function regionToCountry(region: string): Country {
  return REGION_COUNTRY[region] ?? Country.OTHER;
}

/** 관리실 목록 한 줄: 연결 안 된 기사에는 제목이 비슷한 사건 후보를 붙임 */
export function toAdminNewsItem<T extends { caseId: string | null; title: string; titleKo: string | null }>(
  item: T,
  candidates: CaseCandidate[],
) {
  return {
    ...item,
    suggestions: item.caseId ? [] : suggestCases(item.titleKo ?? item.title, candidates),
  };
}

/** 사건에 기록할 출처 (날짜만 남김) */
export function toCaseSource(news: NewsRow) {
  return {
    title: displayTitle(news).slice(0, 300),
    publisher: news.publisher,
    type: SourceType.NEWS,
    publishedAt: news.publishedAt ? new Date(news.publishedAt.toISOString().slice(0, 10)) : null,
    accessedAt: new Date(),
  };
}

/** 사건 타임라인에 넣을 한 줄 */
export function toTimelineEvent(news: NewsRow, caseId: string, title: string, sortOrder: number) {
  return {
    caseId,
    occurredAt: news.publishedAt,
    occurredAtPrecision: news.publishedAt ? DatePrecision.DAY : DatePrecision.UNKNOWN,
    title: title.slice(0, 200),
    description: `${news.publisher} 보도입니다.`,
    sortOrder,
  };
}

export function displayTitle(news: Pick<NewsRow, 'title' | 'titleKo'>) {
  return news.titleKo ?? news.title;
}
