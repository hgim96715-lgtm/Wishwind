import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/auth/admin.guard.js';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  newsActionSchema,
  newsCaseSchema,
  newsListSchema,
  type NewsAction,
  type NewsCaseInput,
  type NewsListQuery,
} from './dto/news.dto.js';
import { NewsAdminService } from './news-admin.service.js';
import { NewsSyncService } from './news-sync.service.js';

/** 새 뉴스 (자동 수집 → 관리자 확인 → 브리핑룸 공개·사건 연결) */
@Controller('admin/news')
@UseGuards(AdminGuard)
export class NewsAdminController {
  constructor(
    private readonly news: NewsAdminService,
    private readonly sync: NewsSyncService,
  ) {}

  @Get()
  list(@Query(new ZodPipe(newsListSchema)) query: NewsListQuery) {
    return this.news.list(query.status, query.scope);
  }

  @Post('sync')
  @HttpCode(200)
  syncNow() {
    return this.sync.sync();
  }

  @Post('translate')
  @HttpCode(200)
  async translate() {
    return { translated: await this.sync.translateMissing() };
  }

  @Post('dismiss-all')
  @HttpCode(200)
  dismissAll() {
    return this.news.dismissAllNew();
  }

  @Post(':id/case')
  createCase(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(newsCaseSchema)) body: NewsCaseInput) {
    return this.news.createCase(id, body);
  }

  @Post(':id')
  @HttpCode(200)
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(newsActionSchema)) body: NewsAction) {
    return this.news.setStatus(id, body);
  }
}
