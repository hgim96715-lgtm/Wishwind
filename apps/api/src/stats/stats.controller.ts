import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service.js';

/** 브리핑룸 '숫자로 보기'에 쓰는 공식 통계 */
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('police-counts')
  policeCounts() {
    return this.stats.policeCounts();
  }
}
