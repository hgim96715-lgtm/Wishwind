import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountModule } from './account/account.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AppController } from './app.controller.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AppService } from './app.service.js';
import { BriefingModule } from './briefing/briefing.module.js';
import { CaseImportModule } from './case-import/case-import.module.js';
import { CaseNotesModule } from './case-notes/case-notes.module.js';
import { validateEnv } from './config/env.js';
import { CasesModule } from './cases/cases.module.js';
import { InquiriesModule } from './inquiries/inquiries.module.js';
import { MissingModule } from './missing/missing.module.js';
import { NewsModule } from './news/news.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StatsModule } from './stats/stats.module.js';
import { SentenceVotesModule } from './sentence-votes/sentence-votes.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    CasesModule,
    CaseNotesModule,
    SentenceVotesModule,
    MissingModule,
    AdminModule,
    BriefingModule,
    InquiriesModule,
    AnalyticsModule,
    NewsModule,
    CaseImportModule,
    AccountModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
