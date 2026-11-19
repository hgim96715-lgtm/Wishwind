import {
  CaseStatus,
  ClaimStatus,
  SentenceType,
  SuspectStatus,
} from '../../generated/prisma/enums.js';
import {
  KEY_FIELDS,
  type ExtractedFact,
  type ExtractedPerson,
  type FactField,
} from './extract.schema.js';

const MIN_QUOTE_LENGTH = 10;
const MASK = '○○○';

export interface SourceDocument {
  url: string;
  publisher: string;
  text: string;
}

export interface SentenceSnapshot {
  courtLevel: string;
  type: string;
  penalty: string | null;
  verdict: string | null;
  decidedAt: string | null;
  isFinal: boolean;
}

export interface SuspectSnapshot {
  ref: string;
  name: string | null;
  alias: string | null;
  status: string;
  /** 실명 보호 규칙의 명시적 예외로 결정된 인물 */
  nameException?: boolean;
  sentences: SentenceSnapshot[];
}

export interface CaseSnapshot {
  slug: string;
  country: string;
  status: string;
  summary: string;
  overview: string | null;
  occurredAt: string | null;
  solvedAt: string | null;
  victimCount: number;
  victimNames: string[];
  suspects: SuspectSnapshot[];
}

export interface RejectedFact {
  fact: ExtractedFact;
  reason: string;
}

export type Verdict = 'CONFIRMED' | 'SINGLE_SOURCE' | 'CONFLICT' | 'MATCHED';

export interface FactGroup {
  key: string;
  field: FactField;
  suspectRef: string | null;
  courtLevel: string | null;
  verdict: Verdict;
  values: string[];
  publishers: string[];
  facts: ExtractedFact[];
}

export interface DbDiff {
  key: string;
  db: string;
  extracted: string;
  kind: '값 다름' | 'DB에 없음' | '출처 충돌';
}

/** 공백, 따옴표 모양, 대소문자 차이만 무시하고 원문과 비교함 */
export function normalizeForMatch(text: string) {
  return text
    .normalize('NFKC')
    .replace(/[​-‍⁠﻿­]/g, '')
    .replace(/[‘’‚‛`´]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, '')
    .toLowerCase();
}

const compact = (text: string) => normalizeForMatch(text);

const DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;
const COUNT = /^\d+$/;
const DATE_FIELDS: ReadonlySet<FactField> = new Set<FactField>([
  'OCCURRED_AT',
  'SOLVED_AT',
  'DECIDED_AT',
]);
const COUNT_FIELDS: ReadonlySet<FactField> = new Set<FactField>([
  'VICTIM_COUNT',
  'DEATH_COUNT',
  'INJURED_COUNT',
]);
const ENUM_FIELDS: Partial<Record<FactField, readonly string[]>> = {
  CASE_STATUS: Object.values(CaseStatus),
  SUSPECT_STATUS: Object.values(SuspectStatus),
  VERDICT: Object.values(SentenceType),
};

function formatError(fact: ExtractedFact) {
  const value = fact.normalizedValue.trim();
  if (!value) return 'normalizedValue가 비어 있습니다';
  if (DATE_FIELDS.has(fact.field) && !DATE.test(value)) {
    return `날짜 형식이 아닙니다: ${value}`;
  }
  if (COUNT_FIELDS.has(fact.field) && !COUNT.test(value)) {
    return `숫자가 아닙니다: ${value}`;
  }
  const allowed = ENUM_FIELDS[fact.field];
  if (allowed && !allowed.includes(value)) {
    return `허용되지 않은 값입니다: ${value}`;
  }
  return null;
}

/** 인용이 실제로 가져온 원문에 있는 사실만 통과시킴 */
export function verifyFacts(
  facts: ExtractedFact[],
  documents: SourceDocument[],
  suspectRefs: string[],
) {
  const texts = new Map(
    documents.map((d) => [d.url, normalizeForMatch(d.text)]),
  );
  const verified: ExtractedFact[] = [];
  const rejected: RejectedFact[] = [];

  for (const fact of facts) {
    const source = texts.get(fact.sourceUrl);
    const quote = normalizeForMatch(fact.quote);
    const refOk =
      fact.suspectRef === null ||
      fact.suspectRef === 'OTHER' ||
      suspectRefs.includes(fact.suspectRef);
    const reason =
      source === undefined
        ? '가져오지 않은 출처를 인용했습니다'
        : quote.length < MIN_QUOTE_LENGTH
          ? '인용이 너무 짧습니다'
          : !source.includes(quote)
            ? '인용을 원문에서 찾지 못했습니다'
            : !refOk
              ? `알 수 없는 가해자 참조입니다: ${fact.suspectRef}`
              : formatError(fact);
    if (reason) rejected.push({ fact, reason });
    else verified.push(fact);
  }
  return { verified, rejected };
}

/** 2019-05와 2019-05-25처럼 정밀도만 다른 날짜는 같은 값으로 봄 */
export function datesCompatible(a: string, b: string) {
  return a.startsWith(b) || b.startsWith(a);
}

function valuesAgree(field: FactField, a: string, b: string) {
  if (DATE_FIELDS.has(field)) return datesCompatible(a, b);
  return compact(a) === compact(b);
}

export function groupFacts(
  facts: ExtractedFact[],
  publisherOf: (url: string) => string,
): FactGroup[] {
  const groups = new Map<string, ExtractedFact[]>();
  for (const fact of facts) {
    const key = [fact.field, fact.suspectRef, fact.courtLevel]
      .filter(Boolean)
      .join(' · ');
    groups.set(key, [...(groups.get(key) ?? []), fact]);
  }

  return [...groups.entries()].map(([key, members]) => {
    const { field, suspectRef, courtLevel } = members[0];
    const values = [...new Set(members.map((f) => f.normalizedValue.trim()))];
    const publishers = [
      ...new Set(members.map((f) => publisherOf(f.sourceUrl))),
    ];
    const agree = values.every((a) =>
      values.every((b) => valuesAgree(field, a, b)),
    );
    let verdict: Verdict;
    if (field === 'LOCATION') verdict = 'MATCHED';
    else if (!agree) verdict = 'CONFLICT';
    else if (publishers.length >= 2) verdict = 'CONFIRMED';
    else verdict = KEY_FIELDS.has(field) ? 'SINGLE_SOURCE' : 'MATCHED';
    return {
      key,
      field,
      suspectRef,
      courtLevel,
      verdict,
      values,
      publishers,
      facts: members,
    };
  });
}

export function claimStatusOf(verdict: Verdict): ClaimStatus {
  if (verdict === 'CONFLICT') return ClaimStatus.CONFLICT;
  if (verdict === 'CONFIRMED') return ClaimStatus.CONFIRMED;
  return ClaimStatus.QUOTE_MATCHED;
}

const isConvicted = (suspect: SuspectSnapshot) =>
  suspect.status === SuspectStatus.CONVICTED &&
  suspect.sentences.some(
    (s) => s.isFinal && s.type !== SentenceType.ACQUITTAL,
  );

/**
 * 국내 사건은 유죄가 확정된 가해자만 실명을 남기고 나머지 사람 이름은 모두 가림.
 * 해외 사건은 모델이 보호 대상으로 표시한 사람과 DB의 무죄·혐의없음 가해자를 가림.
 */
export function protectedNames(
  snapshot: CaseSnapshot,
  people: ExtractedPerson[],
) {
  const domestic = snapshot.country === 'KR';
  const allowed = new Set(
    snapshot.suspects
      .filter((s) => isConvicted(s) || s.nameException)
      .flatMap((s) => (s.name ? [compact(s.name)] : [])),
  );
  const names = new Set<string>();
  for (const person of people) {
    const keep = domestic && allowed.has(compact(person.name));
    if (person.protected || (domestic && !keep)) names.add(person.name.trim());
  }
  for (const suspect of snapshot.suspects) {
    if (suspect.name && !isConvicted(suspect) && !suspect.nameException) {
      if (domestic || suspect.status !== SuspectStatus.SUSPECTED) {
        names.add(suspect.name);
      }
    }
  }
  if (domestic) snapshot.victimNames.forEach((name) => names.add(name));
  return [...names].filter((name) => name.length >= 2);
}

export function maskNames(text: string, names: string[]) {
  return [...names]
    .sort((a, b) => b.length - a.length)
    .reduce((masked, name) => masked.split(name).join(MASK), text);
}

const includesCompact = (haystack: string | null, needle: string) =>
  haystack !== null && compact(haystack).includes(compact(needle));

const OUTCOME_WORDS = ['기각', '파기', '환송', '각하', '인용'];

function outcomeMatches(dbVerdict: string | null, value: string) {
  if (includesCompact(dbVerdict, value)) return true;
  const word = OUTCOME_WORDS.find((w) => value.includes(w));
  return word !== undefined && includesCompact(dbVerdict, word);
}

function compareGroup(
  group: FactGroup,
  snapshot: CaseSnapshot,
): DbDiff | null {
  const extracted = [...group.values].sort(
    (a, b) => b.length - a.length,
  )[0];
  const diff = (db: string | null, kind?: DbDiff['kind']): DbDiff => ({
    key: group.key,
    db: db ?? '(없음)',
    extracted,
    kind: kind ?? (db === null ? 'DB에 없음' : '값 다름'),
  });
  const suspect = snapshot.suspects.find((s) => s.ref === group.suspectRef);
  const sentence = suspect?.sentences.find(
    (s) => s.courtLevel === group.courtLevel,
  );
  const textBody = `${snapshot.summary}\n${snapshot.overview ?? ''}`;

  switch (group.field) {
    case 'OCCURRED_AT':
    case 'SOLVED_AT': {
      const db =
        group.field === 'OCCURRED_AT' ? snapshot.occurredAt : snapshot.solvedAt;
      return db && datesCompatible(db, extracted) ? null : diff(db);
    }
    case 'CASE_STATUS':
      return snapshot.status === extracted ? null : diff(snapshot.status);
    case 'SUSPECT_STATUS':
      if (!suspect) return null;
      return suspect.status === extracted ? null : diff(suspect.status);
    case 'VERDICT':
      if (!suspect) return null;
      return sentence?.type === extracted ? null : diff(sentence?.type ?? null);
    case 'PENALTY':
      if (!suspect) return null;
      return sentence?.penalty &&
        (includesCompact(sentence.penalty, extracted) ||
          includesCompact(extracted, sentence.penalty))
        ? null
        : diff(sentence?.penalty ?? null);
    case 'DECIDED_AT':
      if (!suspect) return null;
      return sentence?.decidedAt &&
        datesCompatible(sentence.decidedAt, extracted)
        ? null
        : diff(sentence?.decidedAt ?? null);
    case 'ADDITIONAL_ORDER':
      if (!suspect) return null;
      return includesCompact(sentence?.penalty ?? null, extracted) ||
        includesCompact(sentence?.verdict ?? null, extracted)
        ? null
        : diff(null);
    case 'APPEAL_OUTCOME':
      if (!suspect) return null;
      return outcomeMatches(sentence?.verdict ?? null, extracted)
        ? null
        : diff(sentence?.verdict ?? null);
    case 'VICTIM_COUNT':
    case 'DEATH_COUNT':
    case 'INJURED_COUNT':
      return textBody.includes(`${extracted}명`) ||
        (group.field !== 'INJURED_COUNT' &&
          snapshot.victimCount === Number(extracted))
        ? null
        : diff(`피해자 행 ${snapshot.victimCount}건`);
    case 'LOCATION':
      return null;
  }
}

export function computeDiffs(groups: FactGroup[], snapshot: CaseSnapshot) {
  const diffs: DbDiff[] = [];
  for (const group of groups) {
    if (group.verdict === 'CONFLICT') {
      diffs.push({
        key: group.key,
        db: '-',
        extracted: group.values.join(' / '),
        kind: '출처 충돌',
      });
      continue;
    }
    const diff = compareGroup(group, snapshot);
    if (diff) diffs.push(diff);
  }
  return diffs;
}

export interface ReviewNoteInput {
  date: string;
  groups: FactGroup[];
  rejected: RejectedFact[];
  diffs: DbDiff[];
  failedSources: { url: string; error: string }[];
  truncatedSources: string[];
  notes: string[];
}

export function buildReviewNote(input: ReviewNoteInput) {
  const count = (verdict: Verdict) =>
    input.groups.filter((g) => g.verdict === verdict);
  const missingKeys = [...KEY_FIELDS].filter(
    (field) => !input.groups.some((g) => g.field === field),
  );
  const lines = [
    `[자동 추출 ${input.date}] 2곳 일치 ${count('CONFIRMED').length}건, 1곳만 확인 ${count('SINGLE_SOURCE').length}건, 출처 충돌 ${count('CONFLICT').length}건, 인용 불일치 ${input.rejected.length}건, DB 차이 ${input.diffs.length}건입니다.`,
    ...count('CONFLICT').map(
      (g) => `출처 충돌: ${g.key} = ${g.values.join(' / ')}`,
    ),
    ...count('SINGLE_SOURCE').map(
      (g) => `1곳만 확인: ${g.key} = ${g.values.join(' / ')}`,
    ),
    ...input.diffs
      .filter((d) => d.kind !== '출처 충돌')
      .map((d) => `DB 차이(${d.kind}): ${d.key} DB=${d.db} 추출=${d.extracted}`),
    ...input.rejected.map(
      (r) => `인용 제외: ${r.fact.field} ${r.fact.sourceUrl} (${r.reason})`,
    ),
    ...input.failedSources.map((s) => `출처 수집 실패: ${s.url} (${s.error})`),
    ...input.truncatedSources.map((url) => `원문 일부만 확인: ${url}`),
    ...(missingKeys.length > 0
      ? [`미확인 핵심 사실: ${missingKeys.join(', ')}`]
      : []),
    ...input.notes.map((note) => `추출 메모: ${note}`),
  ];
  return lines.join('\n');
}
