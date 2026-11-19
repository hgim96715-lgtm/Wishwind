const DAY_MS = 24 * 60 * 60 * 1000;

/** 한국 시간 기준 날짜 (YYYY-MM-DD) */
export function kstDay(now = Date.now()) {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 우리 사이트가 아닌 곳에서 들어온 경우만 도메인을 남김 */
export function referrerHost(referrer: string | undefined, siteHost: string | undefined) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return host && host !== siteHost ? host.slice(0, 200) : null;
  } catch {
    return null;
  }
}

/** 방문이 없던 날도 0으로 채워 그래프가 끊기지 않게 함 */
export function fillDays(rows: { day: string; views: number; visitors: number }[], days: number, now = Date.now()) {
  const map = new Map(rows.map((r) => [r.day, r]));
  return Array.from({ length: days }, (_, i) => {
    const day = kstDay(now - (days - 1 - i) * DAY_MS);
    return map.get(day) ?? { day, views: 0, visitors: 0 };
  });
}

const PAGE_LABEL: Record<string, string> = {
  '/': '홈',
  '/cases': '사건방',
  '/missing': '실종방',
  '/briefing': '브리핑룸',
  '/contact': '문의·의견 보내기',
};

export function decodeSafe(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** 사건 상세(/cases/slug)면 slug를 돌려줌 */
export function caseSlugOf(path: string) {
  const m = /^\/cases\/([^/]+)$/.exec(path);
  return m ? decodeSafe(m[1]) : null;
}

/** 주소 대신 사람이 읽을 이름. 사건 상세는 사건 제목으로 */
export function pathLabel(path: string, caseTitles: Map<string, string>) {
  if (PAGE_LABEL[path]) return PAGE_LABEL[path];
  const slug = caseSlugOf(path);
  if (slug) {
    const title = caseTitles.get(slug);
    return title ? `사건방 · ${title}` : '사건방 · 사건 파일';
  }
  const room = path.split('/')[1];
  const base = room ? PAGE_LABEL[`/${room}`] : undefined;
  return base ? `${base} · ${decodeSafe(path.slice(room.length + 2))}` : decodeSafe(path);
}
