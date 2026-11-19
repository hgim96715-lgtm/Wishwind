import { Injectable } from '@nestjs/common';
import {
  CaseStatus,
  SentenceType,
  type SentenceVoteChoice,
  type SentenceVoteDirection,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SentenceVotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 해결·공개된 사건의 확정 유죄 형량만 투표 대상임 */
  findVotable(sentenceId: string) {
    return this.prisma.sentence.findFirst({
      where: {
        id: sentenceId,
        isFinal: true,
        type: { not: SentenceType.ACQUITTAL },
        suspect: { case: { status: CaseStatus.SOLVED, isPublished: true } },
      },
      select: { id: true },
    });
  }

  upsert(sentenceId: string, voterId: string, choice: SentenceVoteChoice, direction: SentenceVoteDirection | null | undefined) {
    return this.prisma.sentenceVote.upsert({
      where: { sentenceId_voterId: { sentenceId, voterId } },
      create: { sentenceId, voterId, choice, direction },
      update: { choice, direction },
    });
  }

  findMine(sentenceId: string, voterId: string) {
    return this.prisma.sentenceVote.findUnique({
      where: { sentenceId_voterId: { sentenceId, voterId } },
      select: { choice: true, direction: true },
    });
  }

  groupBySentence(sentenceId: string) {
    return this.prisma.sentenceVote.groupBy({
      by: ['choice', 'direction'],
      where: { sentenceId },
      _count: { _all: true },
    });
  }
}
