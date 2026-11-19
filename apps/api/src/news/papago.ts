import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { papagoResponseSchema } from './dto/papago.schema.js';

const URL = 'https://papago.apigw.ntruss.com/nmt/v1/translation';
const TIMEOUT_MS = 10_000;


/**
 * 네이버 클라우드 Papago Translation. 유료(글자 수 과금)라 해외 기사의 제목만 번역함 (수집할 때 + 공개할 때 빠진 것).
 * 키가 없거나 실패하면 null → 원문 제목으로 공개
 */
@Injectable()
export class PapagoTranslator {
  private readonly logger = new Logger(PapagoTranslator.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  isConfigured() {
    return !!this.config.get('PAPAGO_CLIENT_ID', { infer: true });
  }

  async toKorean(text: string, source: string): Promise<string | null> {
    const id = this.config.get('PAPAGO_CLIENT_ID', { infer: true });
    const secret = this.config.get('PAPAGO_CLIENT_SECRET', { infer: true });
    if (!id || !secret || source === 'ko') return null;
    try {
      const res = await fetch(URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ncp-apigw-api-key-id': id,
          'x-ncp-apigw-api-key': secret,
        },
        body: JSON.stringify({ source, target: 'ko', text: text.slice(0, 5000) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        // 응답 본문에는 키가 없지만, 혹시 몰라 상태 코드만 남김
        this.logger.warn(`Papago 번역 실패: HTTP ${res.status}`);
        return null;
      }
      const parsed = papagoResponseSchema.safeParse(await res.json());
      return parsed.success ? parsed.data.message.result.translatedText.slice(0, 300) : null;
    } catch (error) {
      this.logger.warn(`Papago 번역 실패: ${error instanceof Error ? error.name : 'unknown'}`);
      return null;
    }
  }
}
