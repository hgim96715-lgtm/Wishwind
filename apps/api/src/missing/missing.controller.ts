import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { OptionalVoterId, VoterId } from '../common/decorators/voter-id.decorator.js';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import { listMissingSchema, missingIdSchema, type ListMissingQuery } from './dto/missing.dto.js';
import { MissingService } from './missing.service.js';

@Controller('missing')
export class MissingController {
  constructor(private readonly missing: MissingService) {}

  @Get()
  list(@Query(new ZodPipe(listMissingSchema)) query: ListMissingQuery) {
    return this.missing.list(query);
  }

  @Get('regions')
  regions() {
    return this.missing.regions();
  }

  @Get(':id/light')
  lighting(@Param('id', new ZodPipe(missingIdSchema)) id: string, @OptionalVoterId() voterId?: string) {
    return this.missing.lighting(id,voterId);
  }

  @Post(':id/light')
  light(@Param('id', new ZodPipe(missingIdSchema)) id: string, @VoterId() voterId: string) {
    return this.missing.light(id,voterId);
  }

  @Get(':id/translation')
  translation(@Param('id', new ZodPipe(missingIdSchema)) id: string) {
    return this.missing.translation(id);
  }

  @Get(':id')
  detail(@Param('id', new ZodPipe(missingIdSchema)) id: string) {
    return this.missing.findOne(id);
  }
}
