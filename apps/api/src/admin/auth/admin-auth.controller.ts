import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Ip,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { LoginThrottle, issueToken, safeEqual } from './admin-auth.js';
import { ZodPipe } from '../../common/pipes/zod-validation.pipe.js';
import { loginSchema, type LoginInput } from './dto/admin-auth.dto.js';

@Controller('admin')
export class AdminAuthController {
  private readonly throttle = new LoginThrottle();

  constructor(private readonly config: ConfigService<Env, true>) {}

  /** Next 서버가 브라우저 IP를 x-admin-ip로 넘겨줌. 없으면 연결 IP 사용 */
  @Post('login')
  @HttpCode(200)
  login(
    @Body(new ZodPipe(loginSchema)) input: LoginInput,
    @Headers('x-admin-ip') forwardedIp: string | undefined,
    @Ip() ip: string,
  ) {
    const password = this.config.get('ADMIN_PASSWORD', { infer: true });
    const secret = this.config.get('ADMIN_SESSION_SECRET', { infer: true });
    if (!password || !secret) {
      throw new ServiceUnavailableException(
        '관리자 로그인이 설정되지 않았습니다. apps/api/.env에 ADMIN_PASSWORD와 ADMIN_SESSION_SECRET을 넣어 주세요.',
      );
    }
    const key = (forwardedIp ?? ip ?? 'unknown').slice(0, 100);
    if (this.throttle.isLocked(key)) {
      throw new HttpException(
        '로그인 시도가 너무 많습니다. 15분 뒤 다시 시도해 주세요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!safeEqual(input.password, password)) {
      this.throttle.fail(key);
      throw new UnauthorizedException('비밀번호가 맞지 않습니다.');
    }
    this.throttle.reset(key);
    return issueToken(secret);
  }
}
