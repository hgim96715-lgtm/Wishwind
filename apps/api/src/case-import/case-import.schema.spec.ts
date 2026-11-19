import {
  checkEntry,
  checkSolvedTransition,
  importFileSchema,
} from './case-import.schema.js';

const source = {
  url: 'https://example.com/a',
  title: '판결 기사',
  publisher: '예시 통신',
};

function entry(overrides: Record<string, unknown> = {}) {
  const parsed = importFileSchema.parse({
    version: 1,
    cases: [
      {
        slug: 'example-case',
        content: {
          title: '예시 사건',
          summary: '예시 요약',
          country: 'KR',
          category: 'MURDER',
          status: 'IN_PROGRESS',
          occurredAtPrecision: 'DAY',
          ...overrides,
        },
      },
    ],
  });
  return parsed.cases[0];
}

describe('case import rules', () => {
  it('rejects a conviction without a final sentence', () => {
    const { errors } = checkEntry(
      entry({
        suspects: [
          {
            alias: '피고인',
            status: 'CONVICTED',
            sentences: [{ courtLevel: 'FIRST', type: 'LIFE', isFinal: false }],
          },
        ],
      }),
    );
    expect(errors.join()).toContain('확정 판결이 필요합니다');
  });

  it('rejects real names of acquitted people', () => {
    const { errors } = checkEntry(
      entry({ suspects: [{ name: '홍길동', status: 'ACQUITTED' }] }),
    );
    expect(errors.join()).toContain('실명');
  });

  it('rejects claims citing an unlisted source', () => {
    const parsed = importFileSchema.parse({
      version: 1,
      cases: [
        {
          slug: 'example-case',
          sources: [source],
          claims: [
            {
              sourceUrl: 'https://example.com/other',
              field: 'occurredAt',
              value: '2020-01-01',
              quote: '2020년 1월 1일',
            },
          ],
        },
      ],
    });
    expect(checkEntry(parsed.cases[0]).errors.join()).toContain('sources에 없는');
  });

  it('warns about noun-style endings', () => {
    const { warnings } = checkEntry(entry({ overview: '범인이 체포됨' }));
    expect(warnings.join()).toContain('합니다체');
  });

  it('rejects impossible dates', () => {
    expect(() => entry({ occurredAt: '2026-02-31' })).toThrow();
  });
});

describe('suspect photo rules', () => {
  const convicted = {
    name: '홍길동',
    status: 'CONVICTED',
    sentences: [{ courtLevel: 'SUPREME', type: 'LIFE', isFinal: true }],
  };
  const disclosure = {
    identityDisclosedAt: '2024-01-05',
    identityDisclosureAgency: '경찰청',
    identityDisclosureSource: 'https://www.police.go.kr/a',
  };
  const photo = {
    photoUrl: '/suspects/hong.webp',
    photoSourceAgency: '경찰청',
    photoSourceUrl: 'https://www.police.go.kr/a',
  };
  const parse = (suspect: Record<string, unknown>, victim = {}) =>
    importFileSchema.safeParse({
      version: 1,
      cases: [
        {
          slug: 'example-case',
          content: {
            title: '예시 사건',
            summary: '예시 요약',
            country: 'KR',
            category: 'MURDER',
            status: 'SOLVED',
            occurredAtPrecision: 'DAY',
            suspects: [suspect],
            victims: [victim],
          },
        },
      ],
    });

  it('accepts an official photo with a disclosure decision', () => {
    expect(parse({ ...convicted, ...disclosure, ...photo }).success).toBe(true);
  });

  it('rejects a photo without a disclosure decision', () => {
    expect(parse({ ...convicted, ...photo }).success).toBe(false);
  });

  it('rejects press photos and remote files', () => {
    expect(
      parse({
        ...convicted,
        ...disclosure,
        ...photo,
        photoSourceUrl: 'https://news.example.com/a',
      }).success,
    ).toBe(false);
    expect(
      parse({
        ...convicted,
        ...disclosure,
        ...photo,
        photoUrl: 'https://news.example.com/a.jpg',
      }).success,
    ).toBe(false);
  });

  it('rejects a photo for someone not finally convicted', () => {
    expect(
      parse({ ...disclosure, ...photo, name: '홍길동', status: 'INDICTED' })
        .success,
    ).toBe(false);
  });

  it('rejects image keys on a victim', () => {
    expect(parse(convicted, { photoUrl: '/a.jpg' }).success).toBe(false);
    expect(parse(convicted, { image: '/a.jpg' }).success).toBe(false);
  });
});

describe('namu wiki sources', () => {
  it('does not allow citing namu wiki', () => {
    const url = 'https://namu.wiki/w/example';
    const { errors } = checkEntry({
      slug: 'example-case',
      sources: [{ url, title: '문서', publisher: '나무위키', type: 'OTHER' }],
      claims: [
        { sourceUrl: url, field: 'x', value: 'y', quote: 'z', status: 'UNVERIFIED' },
      ],
    });
    expect(errors.join()).toContain('나무위키');
  });
});

describe('question wording rules', () => {
  const warningsFor = (question: string) =>
    checkEntry(entry({ questions: [{ question }] })).warnings.join();

  it('warns about questions on sentence adequacy', () => {
    expect(warningsFor('이 사건에 무기징역은 충분한 처벌일까요?')).toContain(
      '재발 방지',
    );
  });

  it('warns about questions that invite blame', () => {
    expect(warningsFor('이런 범인을 용서할 수 있을까요?')).toContain('비난');
  });

  it('warns about past-fault questions on solved cases only', () => {
    const question = '당시 수사는 왜 진범을 놓쳤을까요?';
    const solved = checkEntry(
      entry({ status: 'SOLVED', solvedAt: '2020-01-01', questions: [{ question }] }),
    );
    expect(solved.warnings.join()).toContain('예방');
    expect(warningsFor(question)).toBe('');
  });

  it('warns about questions predicting a verdict', () => {
    expect(warningsFor('항소법원이 유죄 판단을 유지할까요?')).toContain('예측');
    expect(warningsFor('살인의 고의가 항소심에서도 인정될까요?')).toContain('예측');
  });

  it('accepts a prevention question', () => {
    expect(warningsFor('위험 신호를 더 일찍 알아챌 방법이 있었을까요?')).toBe('');
  });
});

describe('domestic name protection', () => {
  const suspect = { name: '홍길동', status: 'SUSPECTED' };

  it('rejects the name of an unconvicted domestic suspect', () => {
    const { errors } = checkEntry(entry({ suspects: [suspect] }));
    expect(errors.join()).toContain('실명');
  });

  it('allows a documented exception', () => {
    const { errors } = checkEntry(
      entry({
        suspects: [
          {
            ...suspect,
            nameExceptionReason: '경찰이 공식 진범으로 발표',
            nameExceptionDecidedAt: '2026-11-19',
          },
        ],
      }),
    );
    expect(errors).toEqual([]);
  });

  it('requires a decision date with the reason', () => {
    expect(() =>
      entry({ suspects: [{ ...suspect, nameExceptionReason: '사유' }] }),
    ).toThrow();
  });
});

describe('unconfirmed defendant wording', () => {
  const suspects = [{ alias: '피고인', status: 'INDICTED' }];
  const warningsFor = (summary: string, list: unknown[] = suspects) =>
    checkEntry(entry({ summary, suspects: list })).warnings.join();

  it('warns when an act is asserted before a final verdict', () => {
    expect(warningsFor('피고인이 학생을 납치해 살해한 사건입니다.')).toContain(
      '혐의',
    );
  });

  it('accepts allegation wording and events without an actor', () => {
    expect(warningsFor('학생을 살해한 혐의로 재판 중인 사건입니다.')).toBe('');
    expect(warningsFor('전 총리가 총에 맞아 숨진 사건입니다.')).toBe('');
  });

  it('does not warn after a final conviction', () => {
    const convicted = [
      {
        alias: '가해자',
        status: 'CONVICTED',
        sentences: [{ courtLevel: 'SUPREME', type: 'LIFE', isFinal: true }],
      },
    ];
    expect(warningsFor('학생을 살해한 사건입니다.', convicted)).toBe('');
  });
});

describe('solved transition check', () => {
  it('lists items to review when a case becomes solved', () => {
    const warnings = checkSolvedTransition(
      entry({
        status: 'SOLVED',
        solvedAt: '2026-01-01',
        circumstances: [{ title: '남은 정황' }],
        questions: [{ question: '항소심에서 형량이 달라질까요?' }],
        suspects: [{ name: '홍길동', status: 'INDICTED' }],
      }),
    ).join();
    expect(warnings).toContain('의심 정황');
    expect(warnings).toContain('확정된 형량');
    expect(warnings).toContain('질문');
    expect(warnings).toContain('실명');
  });

  it('passes a clean solved case and ignores open cases', () => {
    const clean = entry({
      status: 'SOLVED',
      solvedAt: '2026-01-01',
      suspects: [
        {
          name: '홍길동',
          status: 'CONVICTED',
          sentences: [{ courtLevel: 'SUPREME', type: 'LIFE', isFinal: true }],
        },
      ],
    });
    expect(checkSolvedTransition(clean)).toEqual([]);
    expect(checkSolvedTransition(entry())).toEqual([]);
  });
});
