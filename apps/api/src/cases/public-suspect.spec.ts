import { SentenceType, SuspectStatus } from '../generated/prisma/enums.js';
import { photoCountries, toPublicSuspect } from './public-suspect.js';

const base = {
  name: '홍길동',
  status: SuspectStatus.CONVICTED as SuspectStatus,
  identityDisclosedAt: new Date('2024-01-05'),
  identityDisclosureAgency: '경찰청',
  identityDisclosureSource: 'https://www.police.go.kr/a',
  photoUrl: '/suspects/a.webp',
  photoSourceAgency: '경찰청',
  photoSourceUrl: 'https://www.police.go.kr/a',
  sentences: [{ isFinal: true, type: SentenceType.LIFE as SentenceType }],
};

describe('toPublicSuspect', () => {
  it('hides the photo until the country is cleared', () => {
    const hidden = toPublicSuspect(base, 'KR', photoCountries(undefined));
    expect(hidden.photoUrl).toBeNull();
    expect(hidden.identityDisclosedAt).not.toBeNull();
    const shown = toPublicSuspect(base, 'KR', photoCountries('kr, us'));
    expect(shown.photoUrl).toBe('/suspects/a.webp');
    const all = toPublicSuspect(base, 'JP', photoCountries('*'));
    expect(all.photoUrl).toBe('/suspects/a.webp');
  });

  it('prefixes the storage base URL', () => {
    const shown = toPublicSuspect(
      base,
      'KR',
      photoCountries('*'),
      'https://cdn.example.com/',
    );
    expect(shown.photoUrl).toBe('https://cdn.example.com/suspects/a.webp');
  });

  it('keeps photos hidden for unconfirmed people when all countries are allowed', () => {
    const pending = toPublicSuspect(
      { ...base, status: SuspectStatus.INDICTED },
      'KR',
      photoCountries('*'),
    );
    expect(pending.photoUrl).toBeNull();
  });

  it('never exposes a photo without a final conviction', () => {
    const pending = toPublicSuspect(
      {
        ...base,
        sentences: [{ isFinal: false, type: SentenceType.LIFE }],
      },
      'KR',
      photoCountries('KR'),
    );
    expect(pending.photoUrl).toBeNull();
    expect(pending.identityDisclosedAt).toBeNull();
  });

  it('removes name and photo for an acquitted person', () => {
    const acquitted = toPublicSuspect(
      { ...base, status: SuspectStatus.ACQUITTED },
      'US',
      photoCountries('US'),
    );
    expect(acquitted.name).toBeNull();
    expect(acquitted.photoUrl).toBeNull();
  });
});
