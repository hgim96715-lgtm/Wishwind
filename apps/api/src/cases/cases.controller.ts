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

  /** 사건을 계기로 생긴 법·기념일·제도. ':slug'보다 먼저 둬야 'changes'가 사건 주소로 잡히지 않음 */
  @Get('changes')
  changes() {
    return this.cases.changes();
  }

  @Get('featured')
  featured() {
    return this.cases.homeFeatured();
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.cases.findBySlug(slug);
  }
}
