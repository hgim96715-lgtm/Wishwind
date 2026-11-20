import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { assertNotBlocked } from '../common/voter/blocked-voter.js';
import { InquiryKind, InquiryStatus } from '../generated/prisma/enums.js';
import type { InquiryInput, InquiryListQuery } from './dto/inquiries.dto.js';
import { InquiriesRepository } from './inquiries.repository.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_LIMIT = 5;
const INQUIRY_KINDS = [InquiryKind.QUESTION, InquiryKind.CORRECTION];

/** 관리자가 보기 전이고 답변·처리 전인 글만 고칠 수 있음 */
export function canEdit(q: { status: InquiryStatus; reply: string | null; seenAt: Date | null }) {
  return q.status === InquiryStatus.OPEN && !q.reply && !q.seenAt;
}

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

  /** 내가 보낸 글. editable: 관리자가 아직 보지 않아 고칠 수 있는지 (seenAt은 내보내지 않음) */
  async mine(voterId: string) {
    const rows = await this.repo.listMine(voterId);
    return rows.map(({ seenAt, ...q }) => ({ ...q, editable: canEdit({ ...q, seenAt }) }));
  }

  /** 보낸 글 고치기. 관리자가 보기 전(답변·처리 전)까지만 */
  async editMine(voterId: string, id: string, body: string) {
    const found = await this.repo.findMine(id, voterId);
    if (!found) throw new NotFoundException('글을 찾을 수 없습니다.');
    if (!canEdit(found)) {
      throw new ConflictException('관리자가 이미 확인한 글은 고칠 수 없습니다. 지우고 새로 보내 주세요.');
    }
    await this.repo.update(id, { body });
    return { message: '고쳤습니다.', mine: await this.mine(voterId) };
  }

  /** 보낸 글 지우기. 답변을 받은 뒤에도 지울 수 있음 */
  async deleteMine(voterId: string, id: string) {
    const { count } = await this.repo.deleteMine(id, voterId);
    if (count === 0) throw new NotFoundException('글을 찾을 수 없습니다.');
    return { message: '지웠습니다.', mine: await this.mine(voterId) };
  }

  // ---- 관리자 ----

  async adminList(query: InquiryListQuery) {
    const kinds = query.group === 'feedback' ? [InquiryKind.FEEDBACK] : INQUIRY_KINDS;
    const [items, counts] = await Promise.all([
      this.repo.listByKinds(kinds, query.status),
      this.repo.countByStatus(kinds),
    ]);
    // 관리자가 목록에서 본 글은 보낸 사람이 더는 고칠 수 없음
    const unseen = items.filter((i) => !i.seenAt).map((i) => i.id);
    if (unseen.length) await this.repo.markSeen(unseen);
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
