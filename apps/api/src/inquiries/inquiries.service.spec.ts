import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InquiryStatus } from '../generated/prisma/enums.js';
import type { InquiriesRepository } from './inquiries.repository.js';
import { canEdit, InquiriesService } from './inquiries.service.js';

const open = { status: InquiryStatus.OPEN, reply: null, seenAt: null };

describe('보낸 문의 고치기 조건', () => {
  it('관리자가 보기 전이고 답변 전이면 고칠 수 있음', () => {
    expect(canEdit(open)).toBe(true);
    expect(canEdit({ ...open, seenAt: new Date() })).toBe(false);
    expect(canEdit({ ...open, reply: '답변' })).toBe(false);
    expect(canEdit({ ...open, status: InquiryStatus.CLOSED })).toBe(false);
  });
});

describe('InquiriesService 내 글', () => {
  function setup(found: typeof open | null, deleted = 1) {
    const repo = {
      findMine: vi.fn().mockResolvedValue(found && { id: 'i-1', ...found }),
      update: vi.fn().mockResolvedValue(undefined),
      deleteMine: vi.fn().mockResolvedValue({ count: deleted }),
      listMine: vi.fn().mockResolvedValue([]),
    };
    return { repo, service: new InquiriesService(repo as unknown as InquiriesRepository) };
  }

  it('보기 전이면 고침', async () => {
    const { repo, service } = setup(open);
    await service.editMine('v-1', 'i-1', '고친 내용입니다');
    expect(repo.update).toHaveBeenCalledWith('i-1', { body: '고친 내용입니다' });
  });

  it('관리자가 본 글은 고치지 않음', async () => {
    const { repo, service } = setup({ ...open, seenAt: new Date() });
    await expect(service.editMine('v-1', 'i-1', '고친 내용입니다')).rejects.toBeInstanceOf(ConflictException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('남의 글은 찾을 수 없음', async () => {
    const { service } = setup(null, 0);
    await expect(service.editMine('v-2', 'i-1', '고친 내용입니다')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.deleteMine('v-2', 'i-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
