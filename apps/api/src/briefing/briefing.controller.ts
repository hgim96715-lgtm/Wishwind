import { Controller, Get } from '@nestjs/common';
import { BriefingService } from './briefing.service.js';

/** 브리핑룸 (공개) */
@Controller('briefing')
export class BriefingController {
  constructor(private readonly briefing: BriefingService) {}

  @Get()
  overview() {
    return this.briefing.overview();
  }
}
