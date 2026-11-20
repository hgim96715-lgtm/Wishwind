import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { UserContentStatus } from '../../generated/prisma/enums.js';
import type { AdminModerationRepository } from './admin-moderation.repository.js';
import { AdminModerationService } from './admin-moderation.service.js';

function setup() {
  const repo = {
    dismissReports: vi.fn().mockResolvedValue(undefined),
    updateAnswer: vi.fn().mockResolvedValue(undefined),
  };
  return { repo, service: new AdminModerationService(repo as unknown as AdminModerationRepository) };
}

describe('신고 기각', () => {
  it('답변 신고를 기각하면 신고를 지우고 공개로 둠', async () => {
    const { repo, service } = setup();
    await expect(service.act('answer', 'a-1', 'dismiss')).resolves.toEqual({
      id: 'a-1',
      type: 'answer',
      status: UserContentStatus.PUBLISHED,
    });
    expect(repo.dismissReports).toHaveBeenCalledWith(
      'answer',
      'a-1',
      expect.objectContaining({ create: expect.objectContaining({ category: 'REPORT_DISMISSED' }) }),
    );
    expect(repo.updateAnswer).not.toHaveBeenCalled();
  });

  it('바람개비에는 신고가 없어 기각할 수 없음', async () => {
    const { repo, service } = setup();
    await expect(service.act('cloud', 'c-1', 'dismiss')).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.dismissReports).not.toHaveBeenCalled();
  });
});
