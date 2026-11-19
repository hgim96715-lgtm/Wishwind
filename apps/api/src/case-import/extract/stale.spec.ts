import { findStale, recheckStage, type StaleCandidate } from './stale.js';

const now = new Date('2026-11-19T00:00:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
const candidate = (overrides: Partial<StaleCandidate>): StaleCandidate => ({
  slug: 'sample',
  status: 'IN_PROGRESS',
  lastVerifiedAt: null,
  suspects: [],
  ...overrides,
});

describe('recheck schedule', () => {
  it('separates trials from investigations', () => {
    expect(
      recheckStage(
        candidate({ suspects: [{ status: 'INDICTED', sentences: [] }] }),
      ),
    ).toBe('trial');
    expect(recheckStage(candidate({}))).toBe('investigating');
    expect(recheckStage(candidate({ status: 'UNSOLVED' }))).toBe('unsolved');
    expect(recheckStage(candidate({ status: 'SOLVED' }))).toBeNull();
  });

  it('lists never-verified and overdue cases first', () => {
    const rows = findStale(
      [
        candidate({ slug: 'fresh', lastVerifiedAt: daysAgo(10) }),
        candidate({ slug: 'overdue', lastVerifiedAt: daysAgo(70) }),
        candidate({ slug: 'never' }),
        candidate({
          slug: 'cold',
          status: 'UNSOLVED',
          lastVerifiedAt: daysAgo(100),
        }),
      ],
      now,
    );
    expect(rows.map((r) => r.slug)).toEqual(['never', 'overdue']);
  });

  it('honours custom thresholds', () => {
    const rows = findStale(
      [candidate({ slug: 'recent', lastVerifiedAt: daysAgo(10) })],
      now,
      { trial: 5, investigating: 5, unsolved: 5 },
    );
    expect(rows).toHaveLength(1);
  });
});
