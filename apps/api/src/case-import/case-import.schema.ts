import { z } from 'zod';
import {
  CaseCategory,
  CaseStatus,
  ClaimStatus,
  Country,
  CourtLevel,
  DatePrecision,
  Gender,
  SentenceType,
  SourceType,
  SuspectStatus,
  VictimStatus,
} from '../generated/prisma/enums.js';

const text = (max: number) => z.string().trim().min(1).max(max);
const longText = z.string().trim().min(1);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다')
  .refine((v) => {
    const parsed = new Date(`${v}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(v)
    );
  }, '존재하지 않는 날짜입니다');

const sentenceSchema = z.strictObject({
  courtLevel: z.enum(CourtLevel),
  courtName: text(100).nullish(),
  type: z.enum(SentenceType),
  verdict: longText.nullish(),
  penalty: text(200).nullish(),
  isFinal: z.boolean(),
  decidedAt: isoDate.nullish(),
});

const httpUrl = z.url({ protocol: /^https?$/ }).max(1000);
const LOCAL_PHOTO = /^\/suspects\/[a-z0-9-]+\.webp$/;
const OFFICIAL_HOST = /(^|\.)(go\.kr|gov|gov\.uk|police\.uk|go\.jp)$/i;

/** 나무위키는 단서를 찾는 용도로만 쓰고 검증 출처로 세지 않음 */
export function isClueOnlySource(url: string) {
  return /(^|\.)namu\.(wiki|moe)$/i.test(new URL(url).hostname);
}

const suspectSchema = z
  .strictObject({
    name: text(100).nullish(),
    alias: text(100).nullish(),
    description: longText.nullish(),
    charges: longText.nullish(),
    status: z.enum(SuspectStatus),
    identityDisclosedAt: isoDate.nullish(),
    identityDisclosureAgency: text(100).nullish(),
    identityDisclosureSource: httpUrl.nullish(),
    photoUrl: z
      .string()
      .regex(LOCAL_PHOTO, '사진은 /suspects/ 아래 WebP 파일만 쓸 수 있습니다')
      .max(300)
      .nullish(),
    photoSourceAgency: text(100).nullish(),
    photoSourceUrl: httpUrl.nullish(),
    nameExceptionReason: text(300).nullish(),
    nameExceptionDecidedAt: isoDate.nullish(),
    sentences: z.array(sentenceSchema).default([]),
  })
  .superRefine((suspect, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (!suspect.nameExceptionReason !== !suspect.nameExceptionDecidedAt) {
      fail('실명 예외에는 사유와 결정일이 함께 필요합니다');
    }
    const disclosed =
      suspect.identityDisclosedAt &&
      suspect.identityDisclosureAgency &&
      suspect.identityDisclosureSource;
    if (suspect.identityDisclosedAt && !disclosed) {
      fail('신상공개 결정에는 기관과 출처가 필요합니다');
    }
    if (!suspect.photoUrl) return;
    if (!disclosed) fail('사진에는 신상공개 결정 날짜와 출처가 필요합니다');
    if (suspect.status !== SuspectStatus.CONVICTED) {
      fail('사진은 유죄가 확정된 가해자만 넣을 수 있습니다');
    }
    if (!suspect.photoSourceAgency || !suspect.photoSourceUrl) {
      fail('사진에는 공개 기관과 출처가 필요합니다');
    } else if (!OFFICIAL_HOST.test(new URL(suspect.photoSourceUrl).hostname)) {
      fail('사진 출처는 수사기관 등 공공기관 사이트여야 합니다');
    }
  });

const contentSchema = z.strictObject({
  title: text(200),
  summary: text(500),
  overview: longText.nullish(),
  victimCountNote: text(100).nullish(),
  country: z.enum(Country),
  category: z.enum(CaseCategory),
  status: z.enum(CaseStatus),
  location: text(200).nullish(),
  occurredAt: isoDate.nullish(),
  occurredAtPrecision: z.enum(DatePrecision),
  solvedAt: isoDate.nullish(),
  timeline: z
    .array(
      z.strictObject({
        occurredAt: isoDate.nullish(),
        occurredAtPrecision: z.enum(DatePrecision),
        title: text(200),
        description: longText.nullish(),
      }),
    )
    .default([]),
  victims: z
    .array(
      z.strictObject({
        name: text(100).nullish(),
        alias: text(100).nullish(),
        age: z.number().int().min(0).max(130).nullish(),
        gender: z.enum(Gender).default(Gender.UNKNOWN),
        description: longText.nullish(),
        status: z.enum(VictimStatus).default(VictimStatus.UNKNOWN),
      }),
    )
    .default([]),
  suspects: z.array(suspectSchema).default([]),
  questions: z
    .array(
      z.strictObject({
        question: text(300),
        description: longText.nullish(),
        isResolved: z.boolean().default(false),
        answer: longText.nullish(),
      }),
    )
    .default([]),
  circumstances: z
    .array(
      z.strictObject({
        title: text(200),
        description: longText.nullish(),
      }),
    )
    .default([]),
});

const sourceSchema = z.strictObject({
  url: z
    .url({ protocol: /^https?$/ })
    .max(1000),
  title: text(300),
  publisher: text(200),
  type: z.enum(SourceType).default(SourceType.NEWS),
  publishedAt: isoDate.nullish(),
  accessedAt: isoDate.nullish(),
});

const claimSchema = z.strictObject({
  sourceUrl: z.url({ protocol: /^https?$/ }).max(1000),
  field: text(100),
  value: longText,
  quote: longText,
  status: z.enum(ClaimStatus).default(ClaimStatus.UNVERIFIED),
});

const entrySchema = z.strictObject({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, '소문자, 숫자, 하이픈만 쓸 수 있습니다')
    .max(200),
  content: contentSchema.optional(),
  sources: z.array(sourceSchema).default([]),
  claims: z.array(claimSchema).default([]),
});

export const importFileSchema = z.strictObject({
  version: z.literal(1),
  cases: z.array(entrySchema).min(1),
});

export type ImportFile = z.infer<typeof importFileSchema>;
export type ImportEntry = z.infer<typeof entrySchema>;
export type ImportContent = z.infer<typeof contentSchema>;

const POLITE_SENTENCE = /(습니다|입니다)\.$/;
const POLITE_QUESTION = /까요\?$/;
const SENTENCE_QUESTION = /형량|처벌|형벌|사형|무기징역|징역|엄벌/;
const PAST_FAULT_QUESTION =
  /왜.*(놓쳤|잘못|못했|막지)|막지 못|막을 수 있었|방법은 없었|달랐다면/;
const ASSERTED_ACT =
  /(살해|납치|방화|성폭행|폭행|공격|살인|유기|훼손)(하고|한|했|해|하여)|쏜|쏘았|찔렀|찔러/;
const ALLEGATION = /혐의|기소|의혹|추정|평결|공소/;
const UNCONFIRMED_STATUSES: readonly SuspectStatus[] = [
  SuspectStatus.SUSPECTED,
  SuspectStatus.ARRESTED,
  SuspectStatus.INDICTED,
];

/** 확정 판결 전인 사람이 있는 사건에서 행위를 사실처럼 단정한 문장을 찾음 */
export function findAssertedActs(text: string) {
  return text
    .split(/(?<=[.?!])\s+/)
    .filter((s) => ASSERTED_ACT.test(s) && !ALLEGATION.test(s));
}

const PREDICTION_QUESTION =
  /(선고|인정|기각|확정|파기|감형|유지)될까요|유지할까요|뒤집힐까요|(형량|판결|결과|재판).*달라질까요/;
const BLAME_QUESTION = /용서|괘씸|천벌|악마|괴물|쓰레기|죽어\s*마땅|벌\s*받/;

/** 사건이 해결로 바뀔 때 함께 다시 살펴야 할 항목을 돌려줌 */
export function checkSolvedTransition(entry: ImportEntry) {
  const content = entry.content;
  if (content?.status !== CaseStatus.SOLVED) return [];
  const at = (message: string) => `${entry.slug}: 해결 전환 점검: ${message}`;
  const warnings: string[] = [];

  if (content.circumstances.length > 0) {
    warnings.push(at(`의심 정황 ${content.circumstances.length}건을 정리해 주세요`));
  }
  const hasFinal = content.suspects.some((s) =>
    s.sentences.some((x) => x.isFinal && x.type !== SentenceType.ACQUITTAL),
  );
  if (!hasFinal) warnings.push(at('확정된 형량이 없습니다'));
  for (const { question } of content.questions) {
    if (PREDICTION_QUESTION.test(question) || SENTENCE_QUESTION.test(question)) {
      warnings.push(at(`재판 결과나 형량을 묻는 질문입니다: ${question}`));
    }
  }
  for (const suspect of content.suspects) {
    const identity = suspect.alias ?? '가해자';
    const convicted =
      suspect.status === SuspectStatus.CONVICTED &&
      suspect.sentences.some(
        (x) => x.isFinal && x.type !== SentenceType.ACQUITTAL,
      );
    if (suspect.name && !convicted && !suspect.nameExceptionReason) {
      warnings.push(at(`${identity}: 확정 판결이 없어 실명 공개를 다시 판단해 주세요`));
    }
    if (suspect.photoUrl && (!convicted || !suspect.identityDisclosedAt)) {
      warnings.push(at(`${identity}: 사진 공개 조건을 다시 확인해 주세요`));
    }
  }
  return warnings;
}

/** 형식은 맞아도 사실관계가 어긋나면 안 되는 규칙을 검사함. errors가 있으면 가져오지 않음 */
export function checkEntry(entry: ImportEntry) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const at = (message: string) => `${entry.slug}: ${message}`;

  const urls = entry.sources.map((s) => s.url);
  if (new Set(urls).size !== urls.length) {
    errors.push(at('같은 출처 URL이 중복됐습니다'));
  }
  for (const claim of entry.claims) {
    if (!urls.includes(claim.sourceUrl)) {
      errors.push(at(`sources에 없는 출처를 인용했습니다: ${claim.sourceUrl}`));
    }
    if (isClueOnlySource(claim.sourceUrl)) {
      errors.push(at(`나무위키는 인용 출처로 쓸 수 없습니다: ${claim.sourceUrl}`));
    }
  }
  if (urls.some(isClueOnlySource)) {
    warnings.push(at('나무위키는 검증 출처 2곳에 포함되지 않습니다'));
  }

  const content = entry.content;
  if (!content) return { errors, warnings };

  const identities = new Set<string>();
  for (const suspect of content.suspects) {
    const identity = suspect.name ?? suspect.alias;
    if (!identity) {
      errors.push(at('가해자에는 name 또는 alias가 필요합니다'));
      continue;
    }
    if (identities.has(identity)) {
      errors.push(at(`가해자가 중복됐습니다: ${identity}`));
    }
    identities.add(identity);

    const levels = suspect.sentences.map((s) => s.courtLevel);
    if (new Set(levels).size !== levels.length) {
      errors.push(at(`${identity}: 같은 심급의 판결이 중복됐습니다`));
    }
    const finals = suspect.sentences.filter((s) => s.isFinal);
    if (finals.length > 1) {
      errors.push(at(`${identity}: 확정 판결은 하나만 둘 수 있습니다`));
    }
    if (
      suspect.status === SuspectStatus.CONVICTED &&
      !finals.some((s) => s.type !== SentenceType.ACQUITTAL)
    ) {
      errors.push(at(`${identity}: 유죄 확정(CONVICTED)에는 확정 판결이 필요합니다`));
    }
    if (
      suspect.status === SuspectStatus.ACQUITTED &&
      suspect.name
    ) {
      errors.push(at(`${identity}: 무죄가 확정된 사람은 실명을 넣을 수 없습니다`));
    }
    if (
      content.country === Country.KR &&
      suspect.name &&
      suspect.status !== SuspectStatus.CONVICTED &&
      !suspect.nameExceptionReason
    ) {
      errors.push(
        at(`${identity}: 유죄가 확정되지 않은 국내 인물은 실명을 넣을 수 없습니다`),
      );
    }
  }

  if (content.status === CaseStatus.SOLVED && !content.solvedAt) {
    warnings.push(at('해결 사건인데 solvedAt이 없습니다'));
  }

  const unconfirmed = content.suspects.some(
    (s) =>
      UNCONFIRMED_STATUSES.includes(s.status) &&
      !s.nameExceptionReason &&
      !s.sentences.some((x) => x.isFinal && x.type !== SentenceType.ACQUITTAL),
  );
  if (unconfirmed) {
    for (const text of [content.summary, content.overview ?? '']) {
      for (const sentence of findAssertedActs(text)) {
        warnings.push(
          at(`확정 판결 전에는 혐의·기소로 표현해 주세요: ${sentence.slice(0, 60)}`),
        );
      }
    }
  }

  const sentences = [
    content.overview,
    ...content.timeline.map((t) => t.description),
    ...content.victims.map((v) => v.description),
    ...content.suspects.map((s) => s.description),
    ...content.suspects.flatMap((s) => s.sentences.map((x) => x.verdict)),
    ...content.circumstances.map((c) => c.description),
  ];
  for (const sentence of sentences) {
    if (sentence && !POLITE_SENTENCE.test(sentence)) {
      warnings.push(at(`합니다체가 아닙니다: ${sentence.slice(0, 40)}`));
    }
  }
  for (const { question } of content.questions) {
    if (!POLITE_QUESTION.test(question)) {
      warnings.push(at(`질문이 ~까요?로 끝나지 않습니다: ${question}`));
    }
    if (SENTENCE_QUESTION.test(question)) {
      warnings.push(
        at(`형량을 묻는 대신 재발 방지·예방·대응·지원을 물어 주세요: ${question}`),
      );
    }
    if (content.status === CaseStatus.SOLVED && PAST_FAULT_QUESTION.test(question)) {
      warnings.push(at(`과거를 탓하는 대신 앞으로의 예방을 물어 주세요: ${question}`));
    }
    if (PREDICTION_QUESTION.test(question)) {
      warnings.push(at(`재판 결과를 예측하는 질문은 쓸 수 없습니다: ${question}`));
    }
    if (BLAME_QUESTION.test(question)) {
      warnings.push(at(`가해자 비난을 유도하는 질문입니다: ${question}`));
    }
  }

  return { errors, warnings };
}
