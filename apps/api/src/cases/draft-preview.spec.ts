import { CasesRepository } from './cases.repository.js';
import { CasesService } from './cases.service.js';
import { draftsVisible } from './draft-preview.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const query = { take: 10 } as Parameters<CasesService['list']>[0];

function serviceWith(findMany: ReturnType<typeof vi.fn>, findFirst = vi.fn()) {
  const prisma = { case: { findMany, findFirst } };
  return new CasesService(
    new CasesRepository(prisma as unknown as PrismaService),
  );
}

describe('draft preview', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is never enabled in production', () => {
    expect(
      draftsVisible({ NODE_ENV: 'production', SHOW_DRAFTS: 'true' }),
    ).toBe(false);
  });

  it('needs the explicit flag outside production', () => {
    expect(draftsVisible({ NODE_ENV: 'development' })).toBe(false);
    expect(
      draftsVisible({ NODE_ENV: 'development', SHOW_DRAFTS: 'true' }),
    ).toBe(true);
  });

  it('lists only published cases in production even with the flag', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SHOW_DRAFTS', 'true');
    const findMany = vi.fn().mockResolvedValue([]);
    await serviceWith(findMany).list(query);
    expect(findMany.mock.calls[0][0].where.isPublished).toBe(true);
  });

  it('reads details of published cases only in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SHOW_DRAFTS', 'true');
    const findFirst = vi.fn().mockResolvedValue(null);
    await expect(
      serviceWith(vi.fn(), findFirst).findBySlug('draft-case'),
    ).rejects.toThrow();
    expect(findFirst.mock.calls[0][0].where.isPublished).toBe(true);
  });

  it('includes drafts with a review flag in preview', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SHOW_DRAFTS', 'true');
    const findMany = vi.fn().mockResolvedValue([
      { id: '1', slug: 'a', isPublished: false, reviewStatus: 'DRAFT', status: 'UNSOLVED', suspects: [] },
    ]);
    const { items } = await serviceWith(findMany).list(query);
    expect(findMany.mock.calls[0][0].where.isPublished).toBeUndefined();
    expect(items[0]).toMatchObject({ reviewPending: true, unpublished: true });
    expect(items[0]).not.toHaveProperty('reviewStatus');
  });
});
