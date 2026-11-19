import { Module } from '@nestjs/common';
import { BriefingAdminController } from './briefing-admin.controller.js';
import { BriefingAdminService } from './briefing-admin.service.js';
import { BriefingController } from './briefing.controller.js';
import { BriefingRepository } from './briefing.repository.js';
import { BriefingService } from './briefing.service.js';
import { OpinionSummarizer } from './opinion-summarizer.js';

/** 브리핑룸(공개)과 브리핑 글 관리 */
@Module({
  controllers: [BriefingController, BriefingAdminController],
  providers: [BriefingRepository, BriefingService, BriefingAdminService, OpinionSummarizer],
})
export class BriefingModule {}
