import { Module } from '@nestjs/common';
import { NewsAdminController } from './news-admin.controller.js';
import { NewsAdminService } from './news-admin.service.js';
import { NewsSyncService } from './news-sync.service.js';
import { NewsRepository } from './news.repository.js';
import { PapagoTranslator } from './papago.js';

/** 사건·실종 기사 자동 수집, 해외 제목 번역, 관리실 확인·사건 연결 */
@Module({
  controllers: [NewsAdminController],
  providers: [NewsRepository, NewsAdminService, NewsSyncService, PapagoTranslator],
})
export class NewsModule {}
