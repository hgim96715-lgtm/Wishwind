/** 기사 제목과 사건 제목에 겹치는 낱말로 '이 사건 소식일 수 있음' 후보를 고름 */
export type CaseCandidate = { id: string; title: string; status: string; isPublished: boolean };

// 사건 기사에 흔해서 구분에 도움이 안 되는 낱말
const STOP = new Set([
  '사건', '살인', '살해', '사망', '혐의', '경찰', '검찰', '구속', '체포', '피의자', '피고인',
  '징역', '선고', '재판', '수사', '송치', '기소', '남성', '여성', '연쇄살인', '사고', '실종',
  '20대', '30대', '40대', '50대', '60대', '10대', '흉기', '난동', '속보', '단독', '종합',
]);

export function tokens(text: string) {
  return [
    ...new Set(
      text
        .normalize('NFC')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .map((w) => w.replace(/(은|는|이|가|을|를|의|에|에서|으로|로|와|과|도|만)$/u, ''))
        .filter((w) => w.length >= 2 && !STOP.has(w)),
    ),
  ];
}

export function suggestCases(newsTitle: string, cases: CaseCandidate[], limit = 3) {
  const normalized = newsTitle.normalize('NFC');
  return cases
    .map((c) => {
      const hits = tokens(c.title).filter((t) => normalized.includes(t));
      return { id: c.id, title: c.title, isPublished: c.isPublished, score: hits.length };
    })
    .filter((c) => c.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _score, ...c }) => c);
}
