import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { MissingSource } from '../generated/prisma/enums.js';
import { fbiItemSchema, fbiListSchema } from './schemas/fbi-missing.schema.js';
import { mapFbiItem } from './fbi-missing.mapper.js';
import { applySnapshot } from './missing-store.js';

const USAGE = `사용법:
  pnpm missing import-fbi <파일.json...> [--dry-run]
    브라우저에서 저장한 FBI 목록 JSON을 가져옵니다.
    https://api.fbi.gov/wanted/v1/list?poster_classification=missing&pageSize=50&page=1 (page=2, 3 ...)
    모든 페이지를 한 번에 넣으면 목록에서 빠진 사람은 숨깁니다. 일부만 넣으면 숨기지 않습니다.`;

async function importFbi(prisma: PrismaClient, files: string[], dryRun: boolean) {
  const base = process.env.INIT_CWD ?? process.cwd();
  const byUid = new Map<string, ReturnType<typeof mapFbiItem>>();
  let total = 0;
  let skipped = 0;

  for (const file of files) {
    const json: unknown = JSON.parse(await readFile(path.resolve(base, file), 'utf8'));
    const list = fbiListSchema.parse(json);
    total = Math.max(total, list.total);
    for (const raw of list.items) {
      const item = fbiItemSchema.safeParse(raw);
      if (!item.success || item.data.poster_classification !== 'missing') {
        skipped++;
        continue;
      }
      byUid.set(item.data.uid, mapFbiItem(item.data));
    }
  }

  const items = [...byUid.values()];
  const complete = items.length >= total;
  console.log(`읽은 실종자 ${items.length}명 / FBI 전체 ${total}명, 건너뜀 ${skipped}건`);
  if (!complete) console.log('전체 페이지가 아니라서 목록에서 빠진 사람을 숨기지 않습니다.');
  if (dryRun) {
    console.log('--dry-run: DB에 쓰지 않았습니다.');
    return 0;
  }
  const result = await applySnapshot(prisma, MissingSource.FBI, items, { complete });
  console.log(`반영 완료 ${JSON.stringify(result)}`);
  return 0;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const [command, ...files] = args.filter((a) => a !== '--dry-run');
  if (command !== 'import-fbi' || files.length === 0) {
    console.log(USAGE);
    return 1;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL이 필요합니다');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString, options: '-c TimeZone=UTC' }),
  });
  try {
    return await importFbi(prisma, files, dryRun);
  } finally {
    await prisma.$disconnect();
  }
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error((err as Error).message);
    process.exit(1);
  },
);
