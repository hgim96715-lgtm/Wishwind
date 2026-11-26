const DAY_MS = 24 * 60 * 60 * 1000;

/** 한국 시간 기준 날짜 (YYYY-MM-DD) */
export function kstDay(now = Date.now()) {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 내 컴퓨터(개발)·사설 주소 */
export const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[?::1\]?|0\.0\.0\.0|.*\.local)$/i;

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
  '/missing': '실종자들의 정원',
  '/briefing': '브리핑룸',
  '/contact': '문의·의견 보내기',
  '/changes': '사건이 바꾼 것들',
  '/help': '도움받는 곳',
  '/privacy': '개인정보 처리방침',
  '/login': '로그인',
  '/me': '나의 기록',
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

/** 앱 안 브라우저는 이전 사이트를 알려 주지 않지만 접속 정보에 앱 이름이 남음. 텔레그램·아이메시지 등은 구분할 수 없어 '직접'으로 남음 */
const IN_APP: [RegExp, string][] = [
  [/Instagram/i, 'instagram'],
  [/KAKAOTALK/i, 'kakaotalk'],
  [/FBAN|FBAV|FB_IAB/i, 'facebook'],
  [/NAVER\(inapp/i, 'naver'],
  [/\bLine\//i, 'line'],
  [/DaumApps/i, 'daum'],
];

export function appFromUserAgent(ua: string) {
  const hit = IN_APP.find(([rx]) => rx.test(ua));
  return hit ? `app:${hit[1]}` : null;
}

const APP_LABEL: Record<string, string> = {
  instagram: '인스타그램 앱 안 브라우저',
  kakaotalk: '카카오톡 안 브라우저',
  facebook: '페이스북 앱 안 브라우저',
  naver: '네이버 앱 안 브라우저',
  line: '라인 안 브라우저',
  daum: '다음 앱 안 브라우저',
};

/** 링크 주소에 붙인 ?utm_source=값 → 화면 이름 (모르는 값은 그대로 보여 줌) */
const UTM_LABEL: Record<string, string> = {
  ig: '인스타그램 (프로필 링크)',
  instagram: '인스타그램 (프로필 링크)',
  fb: '페이스북 (링크)',
  facebook: '페이스북 (링크)',
  threads: '스레드 (링크)',
  kakao: '카카오톡 (링크)',
  youtube: '유튜브 (링크)',
};

/** 자주 나오는 이전 사이트 주소 → 화면 이름 */
const HOST_LABEL: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/i, '인스타그램 (링크)'],
  [/(^|\.)facebook\.com$/i, '페이스북'],
  [/^t\.co$/i, 'X(트위터)'],
  [/(^|\.)google\./i, '구글'],
  [/(^|\.)naver\.com$/i, '네이버'],
  [/(^|\.)daum\.net$/i, '다음'],
  [/(^|\.)youtube\.com$/i, '유튜브'],
];

/** 저장된 들어온 곳 값(도메인, app:이름, utm:이름)을 화면에 쓸 이름으로 */
export function referrerLabel(host: string | null) {
  if (!host) return '직접·출처 없음';
  if (host.startsWith('app:')) return APP_LABEL[host.slice(4)] ?? host.slice(4);
  if (host.startsWith('utm:')) {
    const name = host.slice(4);
    return UTM_LABEL[name.toLowerCase()] ?? `링크 표시: ${name}`;
  }
  return HOST_LABEL.find(([rx]) => rx.test(host))?.[1] ?? host;
}

export type TrafficSource = 'search' | 'sns' | 'direct' | 'other';

/** 들어온 곳 분류: 검색(구글·네이버 등), SNS(인스타 등), 직접(주소 입력·북마크·앱 안 링크), 그 밖의 사이트 */
export function sourceOf(host: string | null): TrafficSource {
  if (!host) return 'direct';
  if (host.startsWith('utm:')) return /^(instagram|facebook|threads|x|twitter|kakao|youtube|tiktok|band|reddit)/i.test(host.slice(4)) ? 'sns' : 'other';
  if (/(^|\.)(google|naver|daum|bing|yahoo|duckduckgo|zum|nate|yandex|baidu)\./i.test(host)) return 'search';
  if (/(^|\.)(instagram|facebook|threads|x|twitter|t|kakao|youtube|tiktok|band|reddit|l\.instagram)\./i.test(host) || host === 't.co') {
    return 'sns';
  }
  return 'other';
}

/** 숫자를 보고 할 일을 짧게 제안함 (관리실 '해 볼 일') */
export function growthTips(a: {
  days: number;
  visitorDays: number;
  sources: Record<TrafficSource, number>;
  singlePageVisitors: number;
  topCase?: string;
  topLanding?: string;
  peakHour?: number;
}) {
  const tips: string[] = [];
  const total = Object.values(a.sources).reduce((n, v) => n + v, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  if (a.visitorDays < a.days * 5) {
    tips.push(`최근 ${a.days}일 방문자가 하루 평균 ${(a.visitorDays / a.days).toFixed(1)}명입니다. 처음에는 검색보다 공유로 사람이 옵니다. 인스타그램에 사건 카드나 실종자 카드를 꾸준히 올려 보세요.`);
  }
  if (total > 0 && pct(a.sources.search) < 20) {
    tips.push(`검색으로 들어온 방문이 ${pct(a.sources.search)}%입니다. 구글 서치 콘솔과 네이버 서치어드바이저에서 주요 페이지의 색인·수집을 요청해 보세요.`);
  }
  if (total > 0 && a.sources.sns === 0) {
    tips.push('인스타그램 등 SNS에서 들어온 방문이 아직 없습니다. 인스타그램 프로필 링크와 게시물 글에 사이트 주소를 넣어 보세요.');
  }
  if (total >= 5 && a.singlePageVisitors / total > 0.6) {
    tips.push(`방문자의 ${Math.round((a.singlePageVisitors / total) * 100)}%가 한 페이지만 보고 나갔습니다.${a.topLanding ? ` 가장 많이 들어오는 ‘${a.topLanding}’에서` : ''} 다른 사건이나 실종자들의 정원으로 이어지는 길을 더 눈에 띄게 만들어 보세요.`);
  }
  if (a.topCase) tips.push(`가장 많이 본 사건은 ‘${a.topCase}’입니다. 이 사건을 인스타그램에 소개하거나 관련 영화·다큐를 더 붙여 보세요.`);
  if (a.peakHour !== undefined) {
    const h = a.peakHour;
    tips.push(`방문이 가장 많은 시간은 ${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}시대입니다. 새 게시물은 이 시간 조금 전에 올리면 더 많이 보입니다.`);
  }
  return tips;
}
