import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import { fileEventSchema, fileTargetSchema, type FileEventInput, type FileTargetParams } from './dto/file-stats.dto.js';
import { FileStatsService } from './file-stats.service.js';

/** 사건 파일·실종자 카드의 "N명이 열람, N명이 공유" (공개) */
@Controller('files/:type/:key')
export class FileStatsController {
  constructor(private readonly files: FileStatsService) {}

  @Get('stats')
  stats(@Param(new ZodPipe(fileTargetSchema)) target: FileTargetParams) {
    return this.files.stats(target);
  }

  /** Next 서버가 방문자 IP·브라우저 정보를 헤더로 넘겨줌. 원문은 저장하지 않음 */
  @Post('events')
  @HttpCode(200)
  record(
    @Param(new ZodPipe(fileTargetSchema)) target: FileTargetParams,
    @Body(new ZodPipe(fileEventSchema)) body: FileEventInput,
    @Headers('x-visitor-ip') ip: string | undefined,
    @Headers('x-visitor-ua') ua: string | undefined,
  ) {
    return this.files.record(target, body, ip ?? '', ua ?? '');
  }

  /** 사건의 "함께 기억하기" 숫자 */
  @Get('remember')
  rememberCount(@Param(new ZodPipe(fileTargetSchema)) target: FileTargetParams) {
    return this.files.rememberCount(target);
  }

  @Post('remember')
  @HttpCode(200)
  remember(
    @Param(new ZodPipe(fileTargetSchema)) target: FileTargetParams,
    @Headers('x-visitor-ip') ip: string | undefined,
    @Headers('x-visitor-ua') ua: string | undefined,
  ) {
    return this.files.remember(target, ip ?? '', ua ?? '');
  }
}
