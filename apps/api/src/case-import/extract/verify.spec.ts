import { htmlToText } from './source-text.js';
import type { ExtractedFact } from './extract.schema.js';
import {
  computeDiffs,
  datesCompatible,
  groupFacts,
  maskNames,
  normalizeForMatch,
  protectedNames,
  verifyFacts,
  type CaseSnapshot,
} from './verify.js';

const A = 'https://a.example/1';
const B = 'https://b.example/2';
const publisher = (url: string) => (url === A ? '가신문' : '나방송');

const fact = (overrides: Partial<ExtractedFact>): ExtractedFact => ({
  field: 'PENALTY',
  suspectRef: 'S1',
  courtLevel: 'FIRST',
  value: '무기징역',
  normalizedValue: '무기징역',
  sourceUrl: A,
  quote: '재판부는 피고인에게 무기징역을 선고했다',
  ...overrides,
});

const snapshot: CaseSnapshot = {
  slug: 'sample',
  country: 'KR',
  status: 'SOLVED',
  summary: '요약',
  overview: '피해자 2명이 숨졌습니다.',
  occurredAt: '2019-05',
  solvedAt: null,
  victimCount: 1,
  victimNames: ['김피해'],
  suspects: [
    {
      ref: 'S1',
      name: '이확정',
      alias: null,
      status: 'CONVICTED',
      sentences: [
        {
          courtLevel: 'FIRST',
          type: 'LIFE',
          penalty: '징역 30년',
          verdict: null,
          decidedAt: '2020-02-20',
          isFinal: true,
        },
      ],
    },
    { ref: 'S2', name: '박미정', alias: null, status: 'INDICTED', sentences: [] },
  ],
};

describe('quote verification', () => {
  const documents = [
    { url: A, publisher: '가신문', text: '재판부는  피고인에게\n무기징역을 선고했다. “끝”' },
  ];

  it('accepts a quote that differs only in whitespace', () => {
    const { verified } = verifyFacts([fact({})], documents, ['S1']);
    expect(verified).toHaveLength(1);
  });

  it('rejects a quote missing from the source', () => {
    const { rejected } = verifyFacts(
      [fact({ quote: '재판부는 피고인에게 사형을 선고했다' })],
      documents,
      ['S1'],
    );
    expect(rejected[0].reason).toContain('찾지 못했습니다');
  });

  it('rejects a source that was not fetched and a bad date', () => {
    const { rejected } = verifyFacts(
      [
        fact({ sourceUrl: B }),
        fact({ field: 'DECIDED_AT', normalizedValue: '2020년 2월' }),
      ],
      documents,
      ['S1'],
    );
    expect(rejected).toHaveLength(2);
  });

  it('normalizes curly quotes and full-width text', () => {
    expect(normalizeForMatch('“Ａ B”')).toBe('"ab"');
  });
});

describe('source agreement', () => {
  it('confirms two publishers with the same value', () => {
    const [group] = groupFacts([fact({}), fact({ sourceUrl: B })], publisher);
    expect(group.verdict).toBe('CONFIRMED');
  });

  it('flags different values as a conflict', () => {
    const [group] = groupFacts(
      [fact({}), fact({ sourceUrl: B, normalizedValue: '징역 30년' })],
      publisher,
    );
    expect(group.verdict).toBe('CONFLICT');
  });

  it('keeps a key fact from one publisher as single source', () => {
    const [group] = groupFacts([fact({})], publisher);
    expect(group.verdict).toBe('SINGLE_SOURCE');
  });

  it('treats dates of different precision as compatible', () => {
    expect(datesCompatible('2019-05', '2019-05-25')).toBe(true);
    expect(datesCompatible('2019-05-24', '2019-05-25')).toBe(false);
  });
});

describe('database comparison', () => {
  it('reports a penalty that differs from the database', () => {
    const groups = groupFacts([fact({})], publisher);
    expect(computeDiffs(groups, snapshot)[0]).toMatchObject({
      kind: '값 다름',
      db: '징역 30년',
    });
  });

  it('accepts a count written in the overview', () => {
    const groups = groupFacts(
      [
        fact({
          field: 'DEATH_COUNT',
          suspectRef: null,
          courtLevel: null,
          normalizedValue: '2',
        }),
      ],
      publisher,
    );
    expect(computeDiffs(groups, snapshot)).toEqual([]);
  });
});

describe('name protection', () => {
  it('masks everyone except a convicted domestic suspect', () => {
    const names = protectedNames(snapshot, [
      { name: '이확정', role: 'SUSPECT', protected: false },
      { name: '최목격', role: 'OTHER', protected: false },
    ]);
    expect(names).toEqual(
      expect.arrayContaining(['최목격', '박미정', '김피해']),
    );
    expect(names).not.toContain('이확정');
    expect(maskNames('최목격이 말했다', names)).toBe('○○○이 말했다');
  });
});

describe('htmlToText', () => {
  it('drops scripts and decodes entities', () => {
    expect(
      htmlToText('<p>A&amp;B</p><script>x()</script><div>&#54620;</div>'),
    ).toBe('A&B\n한');
  });
});
