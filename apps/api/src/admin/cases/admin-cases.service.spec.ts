import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AdminCasesService } from './admin-cases.service.js';
import type { AdminCasesRepository } from './admin-cases.repository.js';

function setup(found: { slug: string; isPublished: boolean } | null) {
  const repo = {
    findSummary: vi.fn().mockResolvedValue(found),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  return { repo, service: new AdminCasesService(repo as unknown as AdminCasesRepository) };
}

describe('AdminCasesService.remove', () => {
  it('비공개 사건은 지움', async () => {
    const { repo, service } = setup({ slug: 'news-1', isPublished: false });
    await expect(service.remove('id-1')).resolves.toEqual({ id: 'id-1', slug: 'news-1', deleted: true });
    expect(repo.remove).toHaveBeenCalledWith('id-1');
  });

  it('공개 중인 사건은 지우지 않음', async () => {
    const { repo, service } = setup({ slug: 'case-1', isPublished: true });
    await expect(service.remove('id-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('없는 사건이면 404', async () => {
    const { repo, service } = setup(null);
    await expect(service.remove('id-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.remove).not.toHaveBeenCalled();
  });
});
