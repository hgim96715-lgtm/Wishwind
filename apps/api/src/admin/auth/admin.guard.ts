import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../../config/env.js';
import { verifyToken } from './admin-auth.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext) {
    const secret = this.config.get('ADMIN_SESSION_SECRET', { infer: true });
    if (!secret) {
      throw new ServiceUnavailableException('관리자 로그인이 설정되지 않았습니다.');
    }
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || !verifyToken(token, secret)) {
      throw new UnauthorizedException('다시 로그인해 주세요.');
    }
    return true;
  }
}
