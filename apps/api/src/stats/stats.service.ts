import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { Env } from '../config/env.js';

const NAMESPACE = '15083810/v1';
const SOURCE = '경찰청 5대 범죄 발생건수(공공데이터포털)';
const DAY_MS = 86_400_000;
/** 받기 실패 뒤 이 시간 동안은 데이터포털을 다시 부르지 않음 (서버가 죽어 있을 때 계속 두드리지 않게) */
const RETRY_AFTER_MS = 10 * 60_000;
const TIMEOUT_MS = 15_000;
const LABELS: Record<string, string> = { '강간 강제추행': '강간·강제추행' };

const oasSchema = z.object({
  paths: z.record(z.string(), z.unknown()),
  servers: z.array(z.object({ url: z.string() })).optional(),
});
const bodySchema = z.object({ data: z.array(z.record(z.string(), z.unknown())) });

export interface PoliceCounts {
  source: string;
  /** 데이터포털에서 받은 날 (한국 날짜) */
  fetchedAt: string;
  rows: { label: string; values: Record<string, number> }[];
}

/** 경찰청 5대 범죄 발생건수: 공공데이터포털 OpenAPI에서 받아 하루 동안 메모리에 둠 (연 1회 갱신 자료) */
@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);
  private cache: { value: PoliceCounts; at: number } | null = null;
  private inflight: Promise<PoliceCounts> | null = null;
  private failedAt = 0;
  /** Swagger 문서에서 한 번 읽은 요청 주소 */
  private endpoint: string | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async policeCounts(): Promise<PoliceCounts> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < DAY_MS) return this.cache.value;
    // 방금 실패했다면 마지막 성공값(있으면)을 쓰고 잠시 쉼
    if (now - this.failedAt < RETRY_AFTER_MS) return this.staleOrFail();

    this.inflight ??= this.load().finally(() => (this.inflight = null));
    try {
      const value = await this.inflight;
      this.cache = { value, at: Date.now() };
      return value;
    } catch (error) {
      this.failedAt = Date.now();
      this.logger.warn(`경찰청 통계를 받지 못했습니다: ${error instanceof Error ? error.message : error}`);
      return this.staleOrFail();
    }
  }

  private staleOrFail() {
    if (this.cache) return this.cache.value;
    throw new ServiceUnavailableException('경찰청 통계를 가져오지 못했습니다.');
  }

  private async load(): Promise<PoliceCounts> {
    let key = this.config.get('DATA_GO_KR_KEY', { infer: true });
    if (!key) throw new Error('DATA_GO_KR_KEY가 설정되지 않았습니다.');
    // 인코딩된 키(%2B 등)를 그대로 넣어도 이중으로 인코딩되지 않게 함
    if (/%[0-9a-f]{2}/i.test(key)) key = decodeURIComponent(key);

    const endpoint = (this.endpoint ??= await this.findEndpoint());
    const query = new URLSearchParams({ page: '1', perPage: '100', returnType: 'JSON', serviceKey: key });
    const body = bodySchema.parse(await this.getJson(`${endpoint}?${query}`));

    const rows = body.data.map((row) => {
      const raw = String(row['구분'] ?? '');
      const values = Object.fromEntries(
        Object.entries(row).filter((e): e is [string, number] => /^\d{4}$/.test(e[0]) && typeof e[1] === 'number'),
      );
      return { label: LABELS[raw] ?? raw, values };
    });
    if (rows.length < 5 || rows.some((r) => !r.label || Object.keys(r.values).length === 0)) {
      throw new Error(`예상과 다른 응답입니다. (행 ${rows.length}개)`);
    }
    const fetchedAt = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
    return { source: SOURCE, fetchedAt, rows };
  }

  /** 요청 주소의 고유 번호는 문서(Swagger)에서 읽음 */
  private async findEndpoint() {
    const oas = oasSchema.parse(await this.getJson(`https://infuser.odcloud.kr/oas/docs?namespace=${NAMESPACE}`));
    const path = Object.keys(oas.paths)[0];
    if (!path) throw new Error('API 문서에서 요청 주소를 찾지 못했습니다.');
    const base = (oas.servers?.[0]?.url ?? 'https://api.odcloud.kr/api').replace(/\/$/, '');
    return `${base}${path}`;
  }

  private async getJson(url: string): Promise<unknown> {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
