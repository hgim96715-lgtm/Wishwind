import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { safe182ItemSchema, safe182ListSchema, type Safe182Item } from './schemas/safe182.schema.js';

const SAFE182_LIST_URL = 'https://www.safe182.go.kr/api/lcm/findChildList.do';
const ROW_SIZE = 100;
const MAX_PAGES = 30;
const REQUEST_TIMEOUT_MS = 20_000;
/** 실종아동법 대상만: 010 아동(18세 미만), 060 지적장애인, 070 치매질환자. 가출인(020) 등은 가져오지 않음 */
const TARGETS = ['010', '060', '070'];

@Injectable()
export class Safe182Client {
  private readonly logger = new Logger(Safe182Client.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  isConfigured() {
    return !!this.config.get('SAFE182_ESNTL_ID', { infer: true });
  }

  /** 대상 전체를 페이지 순회로 가져옴. 한 페이지라도 실패하면 전체 실패(일부만 반영되지 않게) */
  async fetchAll(): Promise<Safe182Item[]> {
    const result: Safe182Item[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const body = await this.fetchPage(page);
      const list = body.list ?? [];
      for (const raw of list) {
        const parsed = safe182ItemSchema.safeParse(raw);
        if (parsed.success) result.push(parsed.data);
        else this.logger.warn(`안전Dream 항목 형식 오류로 건너뜀: ${parsed.error.message}`);
      }
      if (list.length < ROW_SIZE || page * ROW_SIZE >= (body.totalCount ?? 0)) return result;
    }
    throw new Error(`안전Dream 목록이 ${MAX_PAGES * ROW_SIZE}건을 넘어 동기화를 멈춤`);
  }

  private async fetchPage(page: number) {
    const form = new URLSearchParams({
      esntlId: this.config.get('SAFE182_ESNTL_ID', { infer: true }) ?? '',
      authKey: this.config.get('SAFE182_AUTH_KEY', { infer: true }) ?? '',
      rowSize: String(ROW_SIZE),
      page: String(page),
    });
    for (const t of TARGETS) form.append('writngTrgetDscds', t);

    const res = await fetch(SAFE182_LIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' },
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`안전Dream API 응답 ${res.status} (page ${page})`);
    const body = safe182ListSchema.parse(await res.json());
    if (body.result === '80') throw new Error('안전Dream 일일 조회 건수를 초과했습니다');
    if (body.result !== '00') {
      // 키 값은 로그에 남기지 않음
      throw new Error(`안전Dream 오류 ${body.result}: ${body.msg ?? ''}`.trim());
    }
    return body;
  }
}
