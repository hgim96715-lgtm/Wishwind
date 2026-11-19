import { Module } from '@nestjs/common';
import { CaseNotesController } from './case-notes.controller.js';
import { CaseNotesRepository } from './case-notes.repository.js';
import { CaseNotesService } from './case-notes.service.js';
import { ContentModerator } from './content-moderator.js';

@Module({
  controllers: [CaseNotesController],
  providers: [CaseNotesService, CaseNotesRepository, ContentModerator],
  exports: [ContentModerator],
})
export class CaseNotesModule {}
