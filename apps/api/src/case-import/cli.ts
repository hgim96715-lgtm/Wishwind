import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { CaseReviewStatus } from '../generated/prisma/enums.js';
import {
  checkEntry,
  checkSolvedTransition,
  importFileSchema,
} from './case-import.schema.js';
import {
  importEntry,
  listReviewStatus,
  publishAllReviewed,
  reviewCase,
  setPublished,
  type ImportResult,
} from './case-import.repository.js';
import {
  listStale,
  readBatchSlugs,
  runExtract,
  runRecheck,
} from './extract/extract.runner.js';
import { DEFAULT_STALE_DAYS } from './extract/stale.js';
import { listHeld, moderateContent } from './moderation.service.js';

const USAGE = `사용법:
  pnpm cases import <파일.json> [--dry-run]   JSON 검증 후 가져오기
  pnpm cases extract <slug...|--batch 파일> [--dry-run] [--fetch-only]
                                              출처 원문 대조 추출 (공개하지 않음)
  pnpm cases moderate list                    확인 대기 중인 사용자 글 보기
  pnpm cases moderate <publish|block> <answer|question> <id>
  pnpm cases stale [--days-trial 30] [--days-investigating 60] [--days-unsolved 180]
                                              재확인이 필요한 사건 보기
  pnpm cases recheck <slug...|--stale>        최신 출처와 DB 비교 (내용은 고치지 않음)
  pnpm cases status                           검토 현황 보기
  pnpm cases review <slug> <상태> [--note 메모]  DRAFT, NEEDS_REVIEW, VERIFIED, REJECTED
  pnpm cases publish <slug>                   검증 완료된 사건 공개
  pnpm cases publish-all                      검토 끝난 초안을 모두 검증 완료 + 공개 (출처 부족 사건은 보류)
  pnpm cases unpublish <slug>                 사건 비공개`;

class DryRunRollback extends Error {}

function parseDays(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 0) {
    throw new Error(`일수는 0 이상의 정수여야 합니다: ${value}`);
  }
  return days;
}

async function runImport(prisma: PrismaClient, file: string, dryRun: boolean) {
  const base = process.env.INIT_CWD ?? process.cwd();
  const raw = await readFile(path.resolve(base, file), 'utf8');
  const parsed = importFileSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      console.error(`형식 오류 ${issue.path.join('.')}: ${issue.message}`);
    }
    return 1;
  }

  const checks = parsed.data.cases.map(checkEntry);
  const slugs = parsed.data.cases.map((c) => c.slug);
  const errors = checks.flatMap((c) => c.errors);
  if (new Set(slugs).size !== slugs.length) {
    errors.push('파일 안에 같은 slug가 중복됐습니다');
  }
  checks.flatMap((c) => c.warnings).forEach((w) => console.warn(`경고 ${w}`));
  const before = await prisma.case.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, status: true },
  });
  parsed.data.cases
    .filter((c) =>
      before.some((b) => b.slug === c.slug && b.status !== 'SOLVED'),
    )
    .flatMap(checkSolvedTransition)
    .forEach((w) => console.warn(`경고 ${w}`));
  if (errors.length > 0) {
    errors.forEach((e) => console.error(`오류 ${e}`));
    return 1;
  }

  // 한 건이라도 실패하면 파일 전체를 되돌림
  const results: ImportResult[] = [];
  try {
    await prisma.$transaction(
      async (tx) => {
        for (const entry of parsed.data.cases) {
          results.push(await importEntry(tx, entry));
        }
        if (dryRun) throw new DryRunRollback();
      },
      { maxWait: 10_000, timeout: 120_000 },
    );
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
  }

  console.table(results);
  console.log(
    dryRun
      ? `검사 완료: ${results.length}건을 가져올 수 있습니다. DB는 바뀌지 않았습니다.`
      : `가져오기 완료: ${results.length}건`,
  );
  return 0;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'dry-run': { type: 'boolean', default: false },
      note: { type: 'string' },
      batch: { type: 'string' },
      'fetch-only': { type: 'boolean', default: false },
      stale: { type: 'boolean', default: false },
      'days-trial': { type: 'string' },
      'days-investigating': { type: 'string' },
      'days-unsolved': { type: 'string' },
    },
  });
  const [command, first, second] = positionals;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL이 필요합니다');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString, options: '-c TimeZone=UTC' }),
  });

  try {
    if (command === 'import' && first) {
      return await runImport(prisma, first, values['dry-run']);
    }
    if (command === 'extract' && (first || values.batch)) {
      const base = process.env.INIT_CWD ?? process.cwd();
      const slugs = values.batch
        ? await readBatchSlugs(path.resolve(base, values.batch))
        : positionals.slice(1);
      return await runExtract(prisma, slugs, {
        dryRun: values['dry-run'],
        fetchOnly: values['fetch-only'],
        importFile: (file, dryRun) => runImport(prisma, file, dryRun),
      });
    }
    const thresholds = {
      trial: parseDays(values['days-trial'], DEFAULT_STALE_DAYS.trial),
      investigating: parseDays(
        values['days-investigating'],
        DEFAULT_STALE_DAYS.investigating,
      ),
      unsolved: parseDays(values['days-unsolved'], DEFAULT_STALE_DAYS.unsolved),
    };
    if (command === 'stale') {
      const rows = await listStale(prisma, thresholds);
      console.table(rows);
      console.log(`재확인 필요 ${rows.length}건`);
      return 0;
    }
    if (command === 'recheck' && (first || values.stale)) {
      const slugs = values.stale
        ? (await listStale(prisma, thresholds)).map((r) => r.slug)
        : positionals.slice(1);
      return await runRecheck(prisma, slugs);
    }
    if (command === 'moderate' && first === 'list') {
      console.table(await listHeld(prisma));
      return 0;
    }
    if (
      command === 'moderate' &&
      (first === 'publish' || first === 'block') &&
      (second === 'answer' || second === 'question') &&
      positionals[3]
    ) {
      await moderateContent(prisma, first, second, positionals[3]);
      console.log(`${second} ${positionals[3]}: ${first}`);
      return 0;
    }
    if (command === 'status') {
      const rows = await listReviewStatus(prisma);
      console.table(rows);
      console.log(`총 ${rows.length}건`);
      return 0;
    }
    if (command === 'review' && first && second) {
      const status = Object.values(CaseReviewStatus).find((s) => s === second);
      if (!status) throw new Error(`알 수 없는 검토 상태입니다: ${second}`);
      await reviewCase(prisma, first, status, values.note);
      console.log(`${first}: ${status}`);
      return 0;
    }
    if (command === 'publish-all') {
      const results = await publishAllReviewed(prisma, values.note);
      console.table(results);
      const ok = results.filter((r) => r.result === '공개').length;
      console.log(`공개 ${ok}건, 보류 ${results.length - ok}건`);
      return 0;
    }
    if ((command === 'publish' || command === 'unpublish') && first) {
      await setPublished(prisma, first, command === 'publish');
      console.log(`${first}: ${command === 'publish' ? '공개' : '비공개'}`);
      return 0;
    }
    console.error(USAGE);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
