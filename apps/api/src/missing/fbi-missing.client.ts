import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Injectable, Logger } from '@nestjs/common';
import { fbiItemSchema, fbiListSchema, type FbiMissingItem } from './schemas/fbi-missing.schema.js';

const FBI_LIST_URL = 'https://api.fbi.gov/wanted/v1/list';
const PAGE_SIZE = 50;
const MAX_PAGES = 20;
const REQUEST_TIMEOUT_S = 15;
const run = promisify(execFile);

@Injectable()
export class FbiMissingClient {
  private readonly logger = new Logger(FbiMissingClient.name);

  /** 실종자 포스터 전체를 페이지 순회로 가져옴. 형식이 다른 항목은 건너뜀 */
  async fetchAll(): Promise<FbiMissingItem[]> {
    const result: FbiMissingItem[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const body = await this.fetchPage(page);
      for (const raw of body.items) {
        const parsed = fbiItemSchema.safeParse(raw);
        if (parsed.success && parsed.data.poster_classification === 'missing') {
          result.push(parsed.data);
        } else if (!parsed.success) {
          this.logger.warn(`FBI 항목 형식 오류로 건너뜀: ${parsed.error.message}`);
        }
      }
      if (body.items.length < PAGE_SIZE || page * PAGE_SIZE >= body.total) {
        return result;
      }
    }
    throw new Error(`FBI 목록이 ${MAX_PAGES * PAGE_SIZE}건을 넘어 동기화를 멈춤`);
  }

  /**
   * api.fbi.gov 앞단의 봇 차단이 Node 내장 fetch 요청은 403으로 막고 curl 요청은 통과시킴
   * FBI 공식 안내도 프로그램 호출을 예시로 들고 있어서, 헤더를 위장하지 않고 curl을 그대로 실행함.
   * 운영 서버에도 curl이 설치돼 있어야 함
   */
  private async fetchPage(page: number) {
    const url = new URL(FBI_LIST_URL);
    url.searchParams.set('poster_classification', 'missing');
    url.searchParams.set('pageSize', String(PAGE_SIZE));
    url.searchParams.set('page', String(page));

    let stdout: string;
    try {
      ({ stdout } = await run(
        'curl',
        ['-sS', '--fail', '--max-time', String(REQUEST_TIMEOUT_S), '-H', 'Accept: application/json', url.toString()],
        { maxBuffer: 20 * 1024 * 1024 },
      ));
    } catch (err) {
      const e = err as { code?: string; stderr?: string; message: string };
      if (e.code === 'ENOENT') throw new Error('curl이 설치돼 있지 않아 FBI 목록을 가져올 수 없습니다');
      throw new Error(`FBI API 요청 실패 (page ${page}): ${(e.stderr ?? e.message).trim()}`);
    }
    return fbiListSchema.parse(JSON.parse(stdout));
  }
}
