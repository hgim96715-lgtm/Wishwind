import { Injectable, NotFoundException } from '@nestjs/common';
import { SentenceVoteChoice, type SentenceVoteDirection } from '../generated/prisma/enums.js';
import { NO_VOTE, toVoteSummary } from './sentence-votes.mapper.js';
import { SentenceVotesRepository } from './sentence-votes.repository.js';

@Injectable()
export class SentenceVotesService {
  constructor(private readonly repo: SentenceVotesRepository) {}

  async get(sentenceId: string, voterId: string | undefined) {
    await this.assertVotable(sentenceId);
    return this.summarize(sentenceId, voterId);
  }

  async cast(sentenceId: string, voterId: string, choice: SentenceVoteChoice, direction?: SentenceVoteDirection) {
    await this.assertVotable(sentenceId);
    // 👎를 다시 눌러 direction 없이 들어오면 이미 고른 방향을 유지하고, 👍로 바꾸면 지움
    const nextDirection = choice === SentenceVoteChoice.AGREE ? null : direction;
    await this.repo.upsert(sentenceId, voterId, choice, nextDirection);
    return this.summarize(sentenceId, voterId);
  }

  private async assertVotable(sentenceId: string) {
    if (!(await this.repo.findVotable(sentenceId))) {
      throw new NotFoundException(`투표할 수 없는 형량입니다: ${sentenceId}`);
    }
  }

  /** 다른 사람의 의견에 영향받지 않도록 투표한 사람에게만 집계를 돌려줌 */
  private async summarize(sentenceId: string, voterId: string | undefined) {
    const mine = voterId ? await this.repo.findMine(sentenceId, voterId) : null;
    if (!mine) return NO_VOTE;
    return toVoteSummary(mine, await this.repo.groupBySentence(sentenceId));
  }
}
