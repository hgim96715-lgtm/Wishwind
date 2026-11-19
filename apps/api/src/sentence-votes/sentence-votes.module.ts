import { Module } from '@nestjs/common';
import { SentenceVotesController } from './sentence-votes.controller.js';
import { SentenceVotesRepository } from './sentence-votes.repository.js';
import { SentenceVotesService } from './sentence-votes.service.js';

@Module({
  controllers: [SentenceVotesController],
  providers: [SentenceVotesRepository, SentenceVotesService],
})
export class SentenceVotesModule {}
