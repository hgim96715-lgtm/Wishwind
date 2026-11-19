import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import type { PrismaClient } from '../../generated/prisma/client.js';
import {
  CaseReviewStatus,
  DatePrecision,
} from '../../generated/prisma/enums.js';
import { isClueOnlySource, type ImportEntry } from '../case-import.schema.js';
import { markVerified, reviewCase } from '../case-import.repository.js';
import {
  FatalExtractError,
  addUsage,
  discoverSources,
  extractFacts,
  type UsageRecord,
} from './llm.js';
import { findStale, type StaleThresholds } from './stale.js';
import { fetchSource, type FetchedSource } from './source-text.js';
import {
  buildReviewNote,
  claimStatusOf,
  computeDiffs,
  groupFacts,
  maskNames,
  protectedNames,
  verifyFacts,
  type CaseSnapshot,
  type DbDiff,
  type SourceDocument,
} from './verify.js';

export const EXTRACTED_DIR = path.resolve('prisma/imports/extracted');

export interface ExtractOptions {
  dryRun: boolean;
  fetchOnly: boolean;
  importFile: (file: string, dryRun: boolean) => Promise<number>;
}

interface Outcome {
  slug: string;
  result: string;
  sources: string;
  confirmed: number;
  single: number;
  conflict: number;
  rejected: number;
  diffs: number;
  inputTokens: number;
  outputTokens: number;
  usd: string;
}

const isoDay = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : null;

function truncateToPrecision(value: string | null, precision: DatePrecision) {
  if (!value || precision === DatePrecision.UNKNOWN) return null;
  if (precision === DatePrecision.YEAR) return value.slice(0, 4);
  if (precision === DatePrecision.MONTH) return value.slice(0, 7);
  return value;
}

async function loadCase(prisma: PrismaClient, slug: string) {
  const found = await prisma.case.findUnique({
    where: { slug },
    include: {
      sources: { orderBy: { createdAt: 'asc' } },
      victims: { select: { name: true } },
      suspects: {
        orderBy: { sortOrder: 'asc' },
        include: { sentences: true },
      },
    },
  });
  if (!found) throw new Error(`사건을 찾을 수 없습니다: ${slug}`);
  return found;
}

type LoadedCase = Awaited<ReturnType<typeof loadCase>>;

function toSnapshot(found: LoadedCase): CaseSnapshot {
  return {
    slug: found.slug,
    country: found.country,
    status: found.status,
    summary: found.summary,
    overview: found.overview,
    occurredAt: truncateToPrecision(
      isoDay(found.occurredAt),
      found.occurredAtPrecision,
    ),
    solvedAt: isoDay(found.solvedAt),
    victimCount: found.victims.length,
    victimNames: found.victims.flatMap((v) => (v.name ? [v.name] : [])),
    suspects: found.suspects.map((s, index) => ({
      ref: `S${index + 1}`,
      name: s.name,
      alias: s.alias,
      status: s.status,
      nameException: s.nameExceptionReason !== null,
      sentences: s.sentences.map((x) => ({
        courtLevel: x.courtLevel,
        type: x.type,
        penalty: x.penalty,
        verdict: x.verdict,
        decidedAt: isoDay(x.decidedAt),
        isFinal: x.isFinal,
      })),
    })),
  };
}

const emptyOutcome = (slug: string, result: string, sources = '-'): Outcome => ({
  slug,
  result,
  sources,
  confirmed: 0,
  single: 0,
  conflict: 0,
  rejected: 0,
  diffs: 0,
  inputTokens: 0,
  outputTokens: 0,
  usd: '-',
});

const withUsage = (outcome: Outcome, usage: UsageRecord | null): Outcome =>
  usage
    ? {
        ...outcome,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        usd: usage.estimatedUsd.toFixed(4),
      }
    : outcome;

interface ExtraSource {
  url: string;
  publisher: string;
}

async function analyzeCase(
  client: Anthropic,
  found: LoadedCase,
  extraSources: ExtraSource[] = [],
) {
  const known = new Set(found.sources.map((s) => s.url));
  const sources: ExtraSource[] = [
    ...found.sources,
    ...extraSources.filter((s) => !known.has(s.url)),
  ].filter((s) => !isClueOnlySource(s.url));

  const fetched: FetchedSource[] = [];
  for (const source of sources) fetched.push(await fetchSource(source.url));
  const failedSources = fetched.flatMap((f) =>
    f.ok ? [] : [{ url: f.url, error: f.error }],
  );
  const succeeded = fetched.flatMap((f) => (f.ok ? [f] : []));
  const sourcesLabel = `${succeeded.length}/${fetched.length}`;
  failedSources.forEach((s) =>
    console.warn(`  수집 실패 ${s.url}: ${s.error}`),
  );
  if (succeeded.length === 0) {
    return {
      ok: false as const,
      error: '가져온 출처 없음',
      sourcesLabel,
      usage: null,
    };
  }

  const publisherByUrl = new Map(sources.map((s) => [s.url, s.publisher]));
  const documents: SourceDocument[] = succeeded.map((f) => ({
    url: f.url,
    publisher: publisherByUrl.get(f.url) ?? f.url,
    text: f.text,
  }));
  const snapshot = toSnapshot(found);
  const llm = await extractFacts(client, snapshot, documents);
  if (!llm.ok) {
    return { ok: false as const, error: llm.error, sourcesLabel, usage: llm.usage };
  }

  const { extraction, usage } = llm;
  const { verified, rejected } = verifyFacts(
    extraction.facts,
    documents,
    snapshot.suspects.map((s) => s.ref),
  );
  const groups = groupFacts(
    verified,
    (url) => publisherByUrl.get(url) ?? url,
  );
  const diffs = computeDiffs(groups, snapshot);
  const names = protectedNames(snapshot, extraction.people);
  const mask = (text: string) => maskNames(text, names);
  const today = new Date().toISOString().slice(0, 10);
  const reviewNote = mask(
    buildReviewNote({
      date: today,
      groups,
      rejected,
      diffs,
      failedSources,
      truncatedSources: succeeded.filter((f) => f.truncated).map((f) => f.url),
      notes: extraction.notes,
    }),
  );
  return {
    ok: true as const,
    sourcesLabel,
    succeeded,
    usage,
    groups,
    diffs,
    rejected,
    mask,
    today,
    reviewNote,
  };
}

function printDiffs(
  slug: string,
  diffs: DbDiff[],
  mask: (text: string) => string,
) {
  if (diffs.length === 0) return;
  console.log(`  DB와 다른 항목 (${slug})`);
  console.table(
    diffs.map((d) => ({
      항목: d.key,
      구분: d.kind,
      DB: mask(d.db),
      추출: mask(d.extracted),
    })),
  );
}

async function extractOne(
  prisma: PrismaClient,
  client: Anthropic | null,
  slug: string,
  options: ExtractOptions,
): Promise<Outcome> {
  const found = await loadCase(prisma, slug);
  if (options.fetchOnly || !client) {
    const urls = found.sources
      .map((s) => s.url)
      .filter((url) => !isClueOnlySource(url));
    const fetched: FetchedSource[] = [];
    for (const url of urls) fetched.push(await fetchSource(url));
    fetched.forEach((f) =>
      f.ok
        ? console.log(`  수집 성공 ${f.url}: ${f.text.length.toLocaleString()}자`)
        : console.warn(`  수집 실패 ${f.url}: ${f.error}`),
    );
    const ok = fetched.filter((f) => f.ok).length;
    return emptyOutcome(slug, '수집만 확인', `${ok}/${fetched.length}`);
  }

  const analysis = await analyzeCase(client, found);
  if (!analysis.ok) {
    return withUsage(
      emptyOutcome(slug, `실패: ${analysis.error}`, analysis.sourcesLabel),
      analysis.usage,
    );
  }
  const {
    sourcesLabel,
    succeeded,
    usage,
    groups,
    diffs,
    rejected,
    mask,
    today,
    reviewNote,
  } = analysis;

  const fetchedUrls = new Set(succeeded.map((f) => f.url));
  const entry: ImportEntry = {
    slug,
    sources: found.sources
      .filter((s) => fetchedUrls.has(s.url))
      .map((s) => ({
        url: s.url,
        title: s.title,
        publisher: s.publisher,
        type: s.type,
        publishedAt: isoDay(s.publishedAt),
        accessedAt: today,
      })),
    claims: groups.flatMap((group) =>
      group.facts.map((fact) => ({
        sourceUrl: fact.sourceUrl,
        field: group.key.replaceAll(' · ', '|'),
        value: mask(fact.value),
        quote: mask(fact.quote),
        status: claimStatusOf(group.verdict),
      })),
    ),
  };

  await mkdir(EXTRACTED_DIR, { recursive: true });
  const file = path.join(EXTRACTED_DIR, `${slug}.json`);
  await writeFile(
    file,
    `${JSON.stringify({ version: 1, cases: [entry] }, null, 2)}\n`,
  );
  await writeFile(
    path.join(EXTRACTED_DIR, `${slug}.report.json`),
    `${JSON.stringify(
      {
        slug,
        extractedAt: new Date().toISOString(),
        usage,
        reviewNote,
        diffs: diffs.map((d) => ({
          ...d,
          db: mask(d.db),
          extracted: mask(d.extracted),
        })),
        groups: groups.map((g) => ({
          key: g.key,
          verdict: g.verdict,
          values: g.values.map(mask),
          publishers: g.publishers,
        })),
        rejected: rejected.map((r) => ({
          field: r.fact.field,
          sourceUrl: r.fact.sourceUrl,
          quote: mask(r.fact.quote),
          reason: r.reason,
        })),
      },
      null,
      2,
    )}\n`,
  );

  printDiffs(slug, diffs, mask);

  const count = (verdict: string) =>
    groups.filter((g) => g.verdict === verdict).length;
  const summary = withUsage(
    {
      ...emptyOutcome(slug, '', sourcesLabel),
      confirmed: count('CONFIRMED'),
      single: count('SINGLE_SOURCE'),
      conflict: count('CONFLICT'),
      rejected: rejected.length,
      diffs: diffs.length,
    },
    usage,
  );

  if (entry.claims.length === 0) {
    return { ...summary, result: '실패: 확인된 인용 없음' };
  }
  if ((await options.importFile(file, true)) !== 0) {
    return { ...summary, result: '실패: 가져오기 검증 오류' };
  }
  if (options.dryRun) return { ...summary, result: '검사 완료(미반영)' };

  if ((await options.importFile(file, false)) !== 0) {
    return { ...summary, result: '실패: 가져오기 오류' };
  }
  await reviewCase(prisma, slug, CaseReviewStatus.NEEDS_REVIEW, reviewNote);
  if (found.isPublished) {
    console.warn(`  ${slug}: 이미 공개된 사건이라 검토 결과를 확인해 주세요`);
  }
  return { ...summary, result: '반영(검토 필요)' };
}

export async function readBatchSlugs(file: string) {
  const parsed: unknown = JSON.parse(await readFile(file, 'utf8'));
  const list = Array.isArray(parsed)
    ? parsed
    : (parsed as { cases?: { slug?: unknown }[] }).cases?.map((c) => c.slug);
  if (!list?.every((slug) => typeof slug === 'string')) {
    throw new Error('배치 파일은 slug 배열이거나 cases[].slug가 있어야 합니다');
  }
  return list as string[];
}

/** API 키나 `ant auth login` 프로필이 있어야 Claude를 호출할 수 있음 */
export function hasCredentials() {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_AUTH_TOKEN ||
    process.env.ANTHROPIC_PROFILE ||
    existsSync(path.join(homedir(), '.config/anthropic')),
  );
}

export const CREDENTIAL_HELP =
  'Claude API 자격 증명이 없습니다. apps/api/.env의 ANTHROPIC_API_KEY에 키를 넣거나 ant auth login을 실행한 뒤 다시 시도해 주세요.';

export async function listStale(
  prisma: PrismaClient,
  thresholds: StaleThresholds,
) {
  const candidates = await prisma.case.findMany({
    where: { status: { not: 'SOLVED' } },
    select: {
      slug: true,
      status: true,
      lastVerifiedAt: true,
      suspects: {
        select: { status: true, sentences: { select: { id: true } } },
      },
    },
  });
  return findStale(candidates, new Date(), thresholds);
}

async function recheckOne(
  prisma: PrismaClient,
  client: Anthropic,
  slug: string,
): Promise<Outcome> {
  const found = await loadCase(prisma, slug);
  const discovery = await discoverSources(
    client,
    toSnapshot(found),
    found.sources.map((s) => s.url),
  );
  if (!discovery.ok) {
    return withUsage(emptyOutcome(slug, `실패: ${discovery.error}`), discovery.usage);
  }
  const analysis = await analyzeCase(client, found, discovery.sources);
  if (!analysis.ok) {
    return withUsage(
      emptyOutcome(slug, `실패: ${analysis.error}`, analysis.sourcesLabel),
      addUsage(discovery.usage, analysis.usage ?? { ...discovery.usage, inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, estimatedUsd: 0 }),
    );
  }

  const { groups, diffs, rejected, mask, reviewNote } = analysis;
  const usage = addUsage(discovery.usage, analysis.usage);
  const confirmed = groups.filter((g) => g.verdict === 'CONFIRMED').length;
  printDiffs(slug, diffs, mask);

  await mkdir(EXTRACTED_DIR, { recursive: true });
  await writeFile(
    path.join(EXTRACTED_DIR, `${slug}.recheck.json`),
    `${JSON.stringify(
      {
        slug,
        checkedAt: new Date().toISOString(),
        usage,
        discovered: discovery.sources.map((s) => ({
          url: s.url,
          title: mask(s.title),
          publisher: s.publisher,
        })),
        diffs: diffs.map((d) => ({
          ...d,
          db: mask(d.db),
          extracted: mask(d.extracted),
        })),
        reviewNote,
      },
      null,
      2,
    )}\n`,
  );

  const summary = withUsage(
    {
      ...emptyOutcome(slug, '', analysis.sourcesLabel),
      confirmed,
      single: groups.filter((g) => g.verdict === 'SINGLE_SOURCE').length,
      conflict: groups.filter((g) => g.verdict === 'CONFLICT').length,
      rejected: rejected.length,
      diffs: diffs.length,
    },
    usage,
  );
  // 내용은 자동으로 고치지 않고 사람이 검토하도록 표시만 함
  if (diffs.length > 0) {
    await reviewCase(prisma, slug, CaseReviewStatus.NEEDS_REVIEW, reviewNote);
    return { ...summary, result: '차이 있음(검토 필요)' };
  }
  if (confirmed === 0) return { ...summary, result: '확인 부족(변경 없음)' };
  await markVerified(prisma, slug);
  return { ...summary, result: '차이 없음(확인일 갱신)' };
}

export async function runRecheck(prisma: PrismaClient, slugs: string[]) {
  if (!hasCredentials()) {
    console.error(CREDENTIAL_HELP);
    return 1;
  }
  const client = new Anthropic({ maxRetries: 4 });
  const outcomes: Outcome[] = [];
  for (const slug of slugs) {
    console.log(`재확인 중: ${slug}`);
    try {
      outcomes.push(await recheckOne(prisma, client, slug));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outcomes.push(emptyOutcome(slug, `실패: ${message}`));
      if (error instanceof FatalExtractError) break;
    }
  }
  console.table(outcomes);
  return outcomes.some((o) => o.result.startsWith('실패')) ? 1 : 0;
}

/** 처음에는 사건을 하나씩 순서대로 처리함 */
export async function runExtract(
  prisma: PrismaClient,
  slugs: string[],
  options: ExtractOptions,
) {
  if (!options.fetchOnly && !hasCredentials()) {
    console.error(CREDENTIAL_HELP);
    return 1;
  }
  const client = options.fetchOnly ? null : new Anthropic({ maxRetries: 4 });
  const outcomes: Outcome[] = [];
  let aborted = false;

  for (const slug of slugs) {
    console.log(`처리 중: ${slug}`);
    try {
      outcomes.push(await extractOne(prisma, client, slug, options));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outcomes.push(emptyOutcome(slug, `실패: ${message}`));
      if (error instanceof FatalExtractError) {
        console.error(`중단합니다: ${message}`);
        aborted = true;
        break;
      }
    }
  }

  console.table(outcomes);
  const total = outcomes.reduce(
    (sum, o) => sum + (o.usd === '-' ? 0 : Number(o.usd)),
    0,
  );
  if (!options.fetchOnly) {
    console.log(`추정 비용 합계: $${total.toFixed(4)}`);
  }
  return aborted || outcomes.some((o) => o.result.startsWith('실패')) ? 1 : 0;
}
