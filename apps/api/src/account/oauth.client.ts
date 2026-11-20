import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { z } from 'zod';
import type { Env } from '../config/env.js';
import type { ProviderName } from './dto/account.dto.js';
import { googleTokenSchema, googleUserInfoSchema, naverProfileSchema, naverTokenSchema } from './schemas/oauth.schema.js';

const TIMEOUT_MS = 8000;
const LOGIN_FAILED = '로그인하지 못했습니다. 다시 시도해 주세요.';

/**
 * 네이버·구글 OAuth 2.0 (Authorization Code). client secret은 API 서버에만 있음.
 * 이메일·이름 같은 프로필은 요청하지 않고, 계정을 구분하는 고유 ID만 받음
 */
@Injectable()
export class OAuthClient {
  constructor(private readonly config: ConfigService<Env, true>) {}

  available(): Record<ProviderName, boolean> {
    return { naver: !!this.credentials('naver'), google: !!this.credentials('google') };
  }

  authorizeUrl(provider: ProviderName, redirectUri: string, state: string) {
    const { id } = this.require(provider);
    if (provider === 'naver') {
      const q = new URLSearchParams({ response_type: 'code', client_id: id, redirect_uri: redirectUri, state });
      return `https://nid.naver.com/oauth2.0/authorize?${q}`;
    }
    const q = new URLSearchParams({
      response_type: 'code',
      client_id: id,
      redirect_uri: redirectUri,
      scope: 'openid',
      state,
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }

  /** code → 공급자 계정 고유 ID */
  async userId(provider: ProviderName, code: string, state: string, redirectUri: string): Promise<string> {
    const { id, secret } = this.require(provider);
    if (provider === 'naver') {
      const q = new URLSearchParams({ grant_type: 'authorization_code', client_id: id, client_secret: secret, code, state });
      const token = await this.json(`https://nid.naver.com/oauth2.0/token?${q}`, { method: 'POST' }, naverTokenSchema);
      if (!token.access_token) throw new BadRequestException(LOGIN_FAILED);
      const me = await this.json(
        'https://openapi.naver.com/v1/nid/me',
        { headers: { authorization: `Bearer ${token.access_token}` } },
        naverProfileSchema,
      );
      if (me.resultcode !== '00' || !me.response) throw new BadRequestException(LOGIN_FAILED);
      return me.response.id;
    }
    const token = await this.json(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: id, client_secret: secret, code, redirect_uri: redirectUri }),
      },
      googleTokenSchema,
    );
    const me = await this.json(
      'https://openidconnect.googleapis.com/v1/userinfo',
      { headers: { authorization: `Bearer ${token.access_token}` } },
      googleUserInfoSchema,
    );
    return me.sub;
  }

  private credentials(provider: ProviderName) {
    const id = this.config.get(provider === 'naver' ? 'NAVER_CLIENT_ID' : 'GOOGLE_CLIENT_ID', { infer: true });
    const secret = this.config.get(provider === 'naver' ? 'NAVER_CLIENT_SECRET' : 'GOOGLE_CLIENT_SECRET', { infer: true });
    return id && secret ? { id, secret } : null;
  }

  private require(provider: ProviderName) {
    const c = this.credentials(provider);
    if (!c) throw new ServiceUnavailableException(`${provider === 'naver' ? '네이버' : '구글'} 로그인이 아직 설정되지 않았습니다.`);
    return c;
  }

  /** 외부 응답은 zod로 검사. 실패 내용(토큰 등)은 로그·응답에 남기지 않음 */
  private async json<T extends z.ZodType>(url: string, init: RequestInit, schema: T): Promise<z.output<T>> {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw new ServiceUnavailableException('로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
    const parsed = schema.safeParse(await res.json().catch(() => null));
    if (!res.ok || !parsed.success) throw new BadRequestException(LOGIN_FAILED);
    return parsed.data;
  }
}
