import { describe, expect, it, vi } from 'vitest';
import { CasesRepository } from './cases.repository.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function setup() {
  const db = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: 'matching-case' }]),
    case: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { db, repo: new CasesRepository(db as unknown as PrismaService) };
}

describe('case search visibility and parameter binding', () => {
  it('keeps publication and country filters after normalized matching', async () => {
    const { db, repo } = setup();
    await repo.findPage({ q: '미라발 자매', country: 'OTHER', take: 20 }, false);
    expect(db.case.findMany.mock.calls[0][0].where).toMatchObject({
      isPublished: true, country: { in: ['OTHER', 'CN'] }, id: { in: ['matching-case'] },
    });
    const query = db.$queryRaw.mock.calls[0][0];
    expect(query.values).toContain('미라발자매');
    expect(query.values).toContain('ACQUITTED');
    expect(query.values).toContain('CLEARED');
  });

  it('binds punctuation as literal search text instead of SQL or wildcard syntax', async () => {
    const { db, repo } = setup();
    const q = "%' OR 1=1 --";
    await repo.findPage({ q, take: 20 }, false);
    const query = db.$queryRaw.mock.calls[0][0];
    expect(query.values).toContain("%'or1=1--");
    expect(query.sql).not.toContain(q);
  });

  it('does not turn an empty search result into an unfiltered list', async () => {
    const { db, repo } = setup();
    db.$queryRaw.mockResolvedValue([]);
    await repo.findPage({ q: '없는사건', take: 20 }, false);
    expect(db.case.findMany.mock.calls[0][0].where.id).toEqual({ in: [] });
  });
});
