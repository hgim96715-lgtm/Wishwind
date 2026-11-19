import { SentenceType, SuspectStatus } from '../generated/prisma/enums.js';

const HIDE_NAME_STATUSES = new Set<SuspectStatus>([
  SuspectStatus.ACQUITTED,
  SuspectStatus.CLEARED,
]);

interface SuspectRow {
  name: string | null;
  status: SuspectStatus;
  identityDisclosedAt: Date | null;
  identityDisclosureAgency: string | null;
  identityDisclosureSource: string | null;
  photoUrl: string | null;
  photoSourceAgency: string | null;
  photoSourceUrl: string | null;
  sentences: { isFinal: boolean; type: SentenceType }[];
}

/** 사진을 공개할 국가 코드 목록. *는 전체 허용이고, 비어 있으면 사진을 전혀 내보내지 않음 */
export function photoCountries(value: string | undefined) {
  return new Set(
    (value ?? '')
      .split(',')
      .map((country) => country.trim().toUpperCase())
      .filter(Boolean),
  );
}

/** 무죄·혐의없음의 실명과, 유죄 확정 전 사람의 신상공개 정보·사진은 응답에서 제외함 */
export function toPublicSuspect<T extends SuspectRow>(
  suspect: T,
  country: string,
  allowedPhotoCountries: ReadonlySet<string>,
  photoBaseUrl = '',
): T {
  const convicted =
    suspect.status === SuspectStatus.CONVICTED &&
    suspect.sentences.some(
      (s) => s.isFinal && s.type !== SentenceType.ACQUITTAL,
    );
  const showDisclosure = convicted && suspect.identityDisclosedAt !== null;
  const showPhoto =
    showDisclosure &&
    (allowedPhotoCountries.has('*') || allowedPhotoCountries.has(country));
  return {
    ...suspect,
    name: HIDE_NAME_STATUSES.has(suspect.status) ? null : suspect.name,
    identityDisclosedAt: showDisclosure ? suspect.identityDisclosedAt : null,
    identityDisclosureAgency: showDisclosure
      ? suspect.identityDisclosureAgency
      : null,
    identityDisclosureSource: showDisclosure
      ? suspect.identityDisclosureSource
      : null,
    photoUrl:
      showPhoto && suspect.photoUrl
        ? `${photoBaseUrl.replace(/\/+$/, '')}${suspect.photoUrl}`
        : null,
    photoSourceAgency: showPhoto ? suspect.photoSourceAgency : null,
    photoSourceUrl: showPhoto ? suspect.photoSourceUrl : null,
  };
}
