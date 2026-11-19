import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller.js';
import { CasesRepository } from './cases.repository.js';
import { CasesService } from './cases.service.js';

@Module({
  controllers: [CasesController],
  providers: [CasesService, CasesRepository],
})
export class CasesModule {}
