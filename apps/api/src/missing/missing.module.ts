import { Module } from '@nestjs/common';
import { CaseNotesModule } from '../case-notes/case-notes.module.js';
import { CloudsController } from './clouds.controller.js';
import { CloudsRepository } from './clouds.repository.js';
import { CloudsService } from './clouds.service.js';
import { FbiMissingClient } from './fbi-missing.client.js';
import { MissingSyncService } from './missing-sync.service.js';
import { MissingController } from './missing.controller.js';
import { MissingRepository } from './missing.repository.js';
import { MissingService } from './missing.service.js';
import { Safe182Client } from './safe182.client.js';
import { MissingTranslator } from './missing-translator.js';

@Module({
  imports: [CaseNotesModule],
  controllers: [MissingController, CloudsController],
  providers: [
    MissingService,
    MissingRepository,
    MissingSyncService,
    FbiMissingClient,
    Safe182Client,
    MissingTranslator,
    CloudsService,
    CloudsRepository,
  ],
  exports: [MissingSyncService],
})
export class MissingModule {}
