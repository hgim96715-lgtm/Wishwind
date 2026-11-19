import { Body, Controller, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { OptionalVoterId, VoterId } from '../common/decorators/voter-id.decorator.js';
import { ZodPipe } from '../common/pipes/zod-validation.pipe.js';
import { castVoteSchema, type CastVoteInput } from './dto/sentence-votes.dto.js';
import { SentenceVotesService } from './sentence-votes.service.js';

/** 브라우저가 아니라 Next 서버가 호출함. 투표자 ID는 Next가 httpOnly 쿠키에서 꺼내 헤더로 넘김 */
@Controller('sentences/:id/votes')
export class SentenceVotesController {
  constructor(private readonly votes: SentenceVotesService) {}

  @Get()
  get(@Param('id', ParseUUIDPipe) id: string, @OptionalVoterId() voterId: string | undefined) {
    return this.votes.get(id, voterId);
  }

  @Put()
  cast(
    @Param('id', ParseUUIDPipe) id: string,
    @VoterId() voterId: string,
    @Body(new ZodPipe(castVoteSchema)) body: CastVoteInput,
  ) {
    return this.votes.cast(id, voterId, body.choice, body.direction);
  }
}
