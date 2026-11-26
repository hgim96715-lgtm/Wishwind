import { Module } from '@nestjs/common';
import { AdminAuthController } from './auth/admin-auth.controller.js';
import { AdminInstagramController } from './instagram/admin-instagram.controller.js';
import { AdminCasesController } from './cases/admin-cases.controller.js';
import { AdminCasesRepository } from './cases/admin-cases.repository.js';
import { AdminCasesService } from './cases/admin-cases.service.js';
import { AdminModerationController } from './moderation/admin-moderation.controller.js';
import { AdminModerationRepository } from './moderation/admin-moderation.repository.js';
import { AdminModerationService } from './moderation/admin-moderation.service.js';
import { AdminOverviewController } from './overview/admin-overview.controller.js';
import { AdminOverviewRepository } from './overview/admin-overview.repository.js';
import { AdminOverviewService } from './overview/admin-overview.service.js';

/**
 * 관리실 전용 기능: 로그인, 첫 화면 집계, 사건 검토·수정, 부적절한 글·참여 제한.
 * 브리핑·문의·분석·뉴스의 관리자 API는 각 모듈에 있고 AdminGuard만 가져다 씀
 */
@Module({
  controllers: [AdminAuthController, AdminOverviewController, AdminCasesController, AdminModerationController, AdminInstagramController],
  providers: [
    AdminOverviewRepository,
    AdminOverviewService,
    AdminCasesRepository,
    AdminCasesService,
    AdminModerationRepository,
    AdminModerationService,
  ],
})
export class AdminModule {}
