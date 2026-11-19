import { Body, Controller, Get, Headers, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/auth/admin.guard.js';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import { pageViewSchema, statsQuerySchema, type PageViewInput, type StatsQuery } from './dto/analytics.dto.js';
import { AnalyticsService } from './analytics.service.js';

@Controller()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** Next 서버가 방문자 IP·브라우저 정보를 헤더로 넘겨줌. 원문은 저장하지 않음 */
  @Post('analytics/pageview')
  @HttpCode(200)
  pageview(
    @Body(new ZodPipe(pageViewSchema)) body: PageViewInput,
    @Headers('x-visitor-ip') ip: string | undefined,
    @Headers('x-visitor-ua') ua: string | undefined,
    @Headers('x-site-host') siteHost: string | undefined,
  ) {
    return this.analytics.record(body, ip ?? '', ua ?? '', siteHost);
  }

  @Get('admin/analytics')
  @UseGuards(AdminGuard)
  stats(@Query(new ZodPipe(statsQuerySchema)) query: StatsQuery) {
    return this.analytics.stats(query.days);
  }
}
