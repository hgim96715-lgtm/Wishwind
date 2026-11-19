/**
 * Google 뉴스 RSS 검색 결과 파서.
 * 기사 본문은 가져오지 않고 제목·링크·언론사·시각만 씀 (저작권: 제목 + 원문 링크만 노출)
 */
export interface NewsCandidate {
  url: string;
  title: string;
  publisher: string;
  publishedAt: Date | null;
}

export const DEFAULT_NEWS_QUERIES = [
  '살인 구속',
  '살인 사건 수사',
  '흉기 난동',
  '실종 수색',
  '실종 아동',
  '납치 체포',
  '방화 살인',
  '미제 사건',
];

export type NewsRegion = 'KR' | 'US' | 'GB' | 'JP';

/** Google 뉴스 지역판. 해외판은 그 나라 언어로 검색해야 현지 기사가 나옴 */
export const EDITIONS: Record<NewsRegion, { hl: string; gl: string; ceid: string; lang: string; queries: string[] }> = {
  KR: { hl: 'ko', gl: 'KR', ceid: 'KR:ko', lang: 'ko', queries: DEFAULT_NEWS_QUERIES },
  US: {
    hl: 'en-US',
    gl: 'US',
    ceid: 'US:en',
    lang: 'en',
    queries: ['murder suspect arrested', 'missing person found', 'cold case solved', 'kidnapping charged'],
  },
  GB: {
    hl: 'en-GB',
    gl: 'GB',
    ceid: 'GB:en',
    lang: 'en',
    queries: ['murder charged', 'missing person appeal', 'cold case'],
  },
  JP: { hl: 'ja', gl: 'JP', ceid: 'JP:ja', lang: 'ja', queries: ['殺人 逮捕', '行方不明 捜索', '未解決事件'] },
};

export function googleNewsUrl(query: string, region: NewsRegion = 'KR', days = 2) {
  const e = EDITIONS[region];
  const q = encodeURIComponent(`${query} when:${days}d`);
  return `https://news.google.com/rss/search?q=${q}&hl=${e.hl}&gl=${e.gl}&ceid=${e.ceid}`;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeEntities(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);
}

function tag(block: string, name: string) {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(block);
  return m ? decodeEntities(m[1]).trim() : '';
}

export function parseGoogleNewsRss(xml: string): NewsCandidate[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.flatMap((block) => {
    const url = tag(block, 'link');
    const publisher = tag(block, 'source') || '알 수 없음';
    let title = tag(block, 'title');
    // 제목 끝의 " - 언론사"는 publisher로 따로 있으므로 뗌
    const suffix = ` - ${publisher}`;
    if (title.endsWith(suffix)) title = title.slice(0, -suffix.length);
    if (!url.startsWith('https://') || !title) return [];
    const date = new Date(tag(block, 'pubDate'));
    return [
      {
        url: url.slice(0, 1000),
        title: title.slice(0, 300),
        publisher: publisher.slice(0, 200),
        publishedAt: Number.isNaN(date.getTime()) ? null : date,
      },
    ];
  });
}

/** 같은 사건을 여러 언론사가 쓴 기사를 묶기 위한 키: 기호·공백을 빼고 앞 24자 */
export function titleKey(title: string) {
  return title
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 24);
}
