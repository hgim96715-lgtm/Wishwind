import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { safeEqual } from '../admin/auth/admin-auth.js';
import type { Env } from '../config/env.js';
import { InboxImportService } from './inbox/inbox-import.service.js';

/**
 * '사건 파일 올리기': 새벽 예약 작업이 만든 사건 JSON을 배포 서버로 바로 보냄.
 * inbox 폴더에 파일을 넣는 것과 같게 검사 후 새 사건만 비공개 초안으로 만듦 (공개·덮어쓰기 없음).
 * 이미 있는 사건에는 관련 콘텐츠(영화·다큐 등)만 담긴 항목일 때 그 링크만 더함 (내용·출처는 그대로).
 * x-import-token 헤더가 CASE_IMPORT_TOKEN과 같아야 함. 값이 설정되지 않았으면(비어 있으면) 이 기능은 꺼짐
 *
 * 예) curl -X POST "$API/api/case-import?name=2026-11-20-nightly" \
 *       -H "x-import-token: $CASE_IMPORT_TOKEN" -H "content-type: application/json" --data @file.json
 */
@Controller('case-import')
export class CaseImportController {
  constructor(
    private readonly inbox: InboxImportService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post()
  @HttpCode(200)
  async upload(
    @Headers('x-import-token') token: string | undefined,
    @Query('name') name: string | undefined,
    @Body() body: unknown,
  ) {
    const expected = this.config.get('CASE_IMPORT_TOKEN', { infer: true });
    if (!expected) throw new ServiceUnavailableException('사건 파일 올리기가 설정되지 않았습니다.');
    if (!token || !safeEqual(token, expected)) throw new UnauthorizedException('올리기 키가 맞지 않습니다.');
    const label = (name ?? '').replace(/[^\w.-]/g, '').slice(0, 80) || `upload-${new Date().toISOString()}`;
    return this.inbox.importData(label, body);
  }
}
