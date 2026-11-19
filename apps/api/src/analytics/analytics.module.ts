import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsRepository } from './analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';
import { FileStatsController } from './file-stats.controller.js';
import { FileStatsRepository } from './file-stats.repository.js';
import { FileStatsService } from './file-stats.service.js';

/** 쿠키 없는 방문 기록(공개), 파일별 열람·공유 숫자(공개), 관리실 방문자 분석 */
@Module({
  controllers: [AnalyticsController, FileStatsController],
  providers: [AnalyticsRepository, AnalyticsService, FileStatsRepository, FileStatsService],
})
export class AnalyticsModule {}
