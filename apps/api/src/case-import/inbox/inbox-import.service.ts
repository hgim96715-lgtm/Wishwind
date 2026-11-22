import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { CaseReviewStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { checkEntry, importFileSchema } from '../case-import.schema.js';
import { importEntry } from '../case-import.repository.js';

const FIRST_RUN_DELAY_MS = 30_000;
const INTERVAL_MS = 10 * 60 * 1000;
/** 관리실 "새로 들어온 사건"을 고를 때 쓰는 표시. reviewNote 맨 앞에 붙음 */
export const AUTO_IMPORT_NOTE = '자동 수집';

export type InboxResult = {
  file: string;
  created: string[];
  /** 이미 있는 사건에 관련 콘텐츠(영화·다큐 등)만 더한 것 */
  relatedAdded?: string[];
  skipped: { slug: string; reason: string }[];
  error?: string;
};

/**
 * 예약 작업이 새벽에 넣어 둔 사건 파일(prisma/imports/inbox/*.json)을 비공개 초안으로 가져옴.
 * - 새 사건만 만듦. 이미 있는 slug는 건드리지 않음 (공개 사건을 덮어쓰지 않게)
 * - 검사 규칙(checkEntry)에서 오류가 난 사건은 건너뛰고 사유를 남김
 * - 처리한 파일은 inbox/done, 읽을 수 없는 파일은 inbox/failed로 옮김
 * 공개는 하지 않음. 관리자가 관리실에서 확인하고 검증 완료·공개를 누름
 */
@Injectable()
export class InboxImportService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(InboxImportService.name);
  private timers: NodeJS.Timeout[] = [];
  private running = false;
  private readonly dir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.dir = resolve(config.get('CASE_INBOX_DIR', { infer: true }));
  }

  onApplicationBootstrap() {
    const run = () => void this.run().catch((e: unknown) => this.logger.warn(`사건 inbox 처리 실패: ${String(e)}`));
    this.timers.push(setTimeout(run, FIRST_RUN_DELAY_MS));
    this.timers.push(setInterval(run, INTERVAL_MS));
    for (const t of this.timers) t.unref();
  }

  onApplicationShutdown() {
    for (const t of this.timers) clearTimeout(t);
  }

  async run(): Promise<InboxResult[]> {
    if (this.running) return [];
    this.running = true;
    try {
      let files: string[];
      try {
        files = (await readdir(this.dir)).filter((f) => f.endsWith('.json')).sort();
      } catch {
        return []; // inbox 폴더가 아직 없음
      }
      const results: InboxResult[] = [];
      for (const file of files) results.push(await this.importFile(file));
      return results;
    } finally {
      this.running = false;
    }
  }

  private async importFile(file: string): Promise<InboxResult> {
    let data: unknown;
    try {
      data = JSON.parse(await readFile(join(this.dir, file), 'utf8'));
    } catch (error) {
      const result: InboxResult = {
        file,
        created: [],
        skipped: [],
        error: `JSON을 읽을 수 없습니다: ${error instanceof Error ? error.message : String(error)}`,
      };
      await this.moveTo('failed', file, result);
      this.logger.warn(`사건 inbox ${file}: ${result.error}`);
      return result;
    }
    const result = await this.importData(file, data);
    await this.moveTo(result.error ? 'failed' : 'done', file, result);
    return result;
  }

  /**
   * 사건 파일 내용을 비공개 초안으로 가져옴. inbox 파일과 '사건 파일 올리기' API(배포 서버)가 함께 씀.
   * name은 결과 기록용 이름(앞 10자가 날짜면 검토 메모에 그 날짜를 씀)
   */
  async importData(name: string, data: unknown): Promise<InboxResult> {
    const result: InboxResult = { file: name, created: [], relatedAdded: [], skipped: [] };
    const parsed = importFileSchema.safeParse(data);
    if (!parsed.success) {
      result.error = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      this.logger.warn(`사건 가져오기 ${name}: ${result.error}`);
      return result;
    }

    const existing = new Set(
      (
        await this.prisma.case.findMany({
          where: { slug: { in: parsed.data.cases.map((c) => c.slug) } },
          select: { slug: true },
        })
      ).map((c) => c.slug),
    );
    const day = /^\d{4}-\d{2}-\d{2}/.test(name) ? name.slice(0, 10) : new Date().toISOString().slice(0, 10);
    for (const entry of parsed.data.cases) {
      if (existing.has(entry.slug)) {
        // 이미 있는 사건은 덮어쓰지 않음. 단 관련 콘텐츠(영화·다큐 등)만 담긴 항목은 '더 보기' 링크만 더함
        // (내용·출처·공개 상태는 그대로. 관련 콘텐츠는 검토 상태에 영향 없음)
        const relatedOnly = !entry.content && entry.sources.length === 0 && entry.claims.length === 0 && (entry.related?.length ?? 0) > 0;
        if (!relatedOnly) {
          result.skipped.push({ slug: entry.slug, reason: '이미 있는 사건' });
          continue;
        }
        const { errors } = checkEntry(entry);
        if (errors.length > 0) {
          result.skipped.push({ slug: entry.slug, reason: errors.join(' / ') });
          continue;
        }
        try {
          await this.prisma.$transaction((tx) => importEntry(tx, entry), { timeout: 30_000 });
          result.relatedAdded?.push(entry.slug);
        } catch (error) {
          result.skipped.push({ slug: entry.slug, reason: error instanceof Error ? error.message : String(error) });
        }
        continue;
      }
      if (!entry.content) {
        result.skipped.push({ slug: entry.slug, reason: '내용(content)이 없음' });
        continue;
      }
      const { errors } = checkEntry(entry);
      if (errors.length > 0) {
        result.skipped.push({ slug: entry.slug, reason: errors.join(' / ') });
        continue;
      }
      try {
        await this.prisma.$transaction(
          async (tx) => {
            await importEntry(tx, entry);
            await tx.case.update({
              where: { slug: entry.slug },
              data: {
                reviewStatus: CaseReviewStatus.DRAFT,
                isPublished: false,
                reviewNote: `${AUTO_IMPORT_NOTE} (${day}): 내용과 출처를 확인한 뒤 검증 완료·공개해 주세요.`,
              },
            });
          },
          { timeout: 30_000 },
        );
        result.created.push(entry.slug);
      } catch (error) {
        result.skipped.push({ slug: entry.slug, reason: error instanceof Error ? error.message : String(error) });
      }
    }
    this.logger.log(
      `사건 가져오기 ${name}: 새 초안 ${result.created.length}건, 관련 콘텐츠 추가 ${result.relatedAdded?.length ?? 0}건, 건너뜀 ${result.skipped.length}건`,
    );
    return result;
  }

  /** 처리한 파일을 옮기고 결과를 옆에 남김 (같은 파일을 두 번 가져오지 않게) */
  private async moveTo(folder: 'done' | 'failed', file: string, result: InboxResult) {
    const target = join(this.dir, folder);
    await mkdir(target, { recursive: true });
    await rename(join(this.dir, file), join(target, file));
    await writeFile(join(target, `${file}.result.json`), `${JSON.stringify(result, null, 2)}\n`);
  }
}
