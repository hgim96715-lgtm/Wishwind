import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { assertNotBlocked } from '../common/voter/blocked-voter.js';
import { InquiryKind, InquiryStatus } from '../generated/prisma/enums.js';
import type { InquiryInput, InquiryListQuery } from './dto/inquiries.dto.js';
import { InquiriesRepository } from './inquiries.repository.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_LIMIT = 5;
const INQUIRY_KINDS = [InquiryKind.QUESTION, InquiryKind.CORRECTION];

@Injectable()
export class InquiriesService {
  constructor(private readonly repo: InquiriesRepository) {}

  async create(voterId: string, input: InquiryInput) {
    await assertNotBlocked(this.repo.prisma, voterId);
    const today = await this.repo.countSince(voterId, new Date(Date.now() - DAY_MS));
    if (today >= DAILY_LIMIT) {
      throw new HttpException('오늘은 더 보낼 수 없습니다. 내일 다시 보내 주세요.', HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.repo.create({ ...input, voterId });
    return {
      message:
        input.kind === InquiryKind.FEEDBACK
          ? '의견을 보냈습니다. 고맙습니다.'
          : '문의를 보냈습니다. 답변은 이 페이지에서 확인할 수 있습니다.',
      mine: await this.mine(voterId),
    };
  }

  mine(voterId: string) {
    return this.repo.listMine(voterId);
  }

  // ---- 관리자 ----

  async adminList(query: InquiryListQuery) {
    const kinds = query.group === 'feedback' ? [InquiryKind.FEEDBACK] : INQUIRY_KINDS;
    const [items, counts] = await Promise.all([
      this.repo.listByKinds(kinds, query.status),
      this.repo.countByStatus(kinds),
    ]);
    return { items, counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) };
  }

  async reply(id: string, reply: string) {
    await this.findOrThrow(id);
    return this.repo.update(id, { reply, repliedAt: new Date(), status: InquiryStatus.ANSWERED });
  }

  async setStatus(id: string, status: InquiryStatus) {
    await this.findOrThrow(id);
    return this.repo.update(id, { status });
  }

  private async findOrThrow(id: string) {
    if (!(await this.repo.exists(id))) throw new NotFoundException('문의를 찾을 수 없습니다.');
  }
}
