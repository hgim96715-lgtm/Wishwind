import { Controller, Get, Param, Query } from '@nestjs/common';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import { CasesService } from './cases.service.js';
import { listCasesSchema, type ListCasesQuery } from './dto/cases.dto.js';

@Controller('cases')
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Get()
  list(@Query(new ZodPipe(listCasesSchema)) query: ListCasesQuery) {
    return this.cases.list(query);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.cases.findBySlug(slug);
  }
}
