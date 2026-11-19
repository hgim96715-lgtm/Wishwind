import { Body, Controller, Get, Post } from '@nestjs/common';
import { OptionalVoterId, VoterId } from '../common/decorators/voter-id.decorator.js';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import { CloudsService } from './clouds.service.js';
import { cloudSchema, type CloudInput } from './dto/clouds.dto.js';

/** 브라우저가 아니라 Next 서버가 호출함. 익명 ID는 httpOnly 쿠키에서 꺼내 헤더로 넘김 */
@Controller('missing-clouds')
export class CloudsController {
  constructor(private readonly clouds: CloudsService) {}

  @Get()
  list(@OptionalVoterId() voterId?: string) {
    return this.clouds.list(voterId);
  }

  @Post()
  place(@VoterId() voterId: string, @Body(new ZodPipe(cloudSchema)) input: CloudInput) {
    return this.clouds.place(voterId, input.body, input.position);
  }
}
