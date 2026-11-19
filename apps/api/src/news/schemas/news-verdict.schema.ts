import { z } from 'zod';

/** 사건 종류: prisma CaseCategory와 같은 값 */
/** 사건이 일어난 나라: prisma Country와 같은 값 */
export const EVENT_COUNTRY = ['KR', 'US', 'JP', 'CN', 'GB', 'OTHER'] as const;

const CATEGORY = ['MURDER', 'MISSING', 'KIDNAPPING', 'SEXUAL_CRIME', 'ROBBERY', 'ARSON', 'TERROR', 'FRAUD', 'OTHER'] as const;

/**
 * 기사 제목 자동 분류 응답. id는 요청에 넣은 번호 그대로.
 * caseEvent:
 * - FACT: 사실로 확인된 사건 단계 (실종 신고·수색·발견, 시신·유류품 발견, 기소, 구형, 선고, 확정, 신원 확인)
 * - UNCONFIRMED: 아직 사실로 단정할 수 없는 단계 (의혹, 주장, 재호소, 체포·구속 직후, 수사 착수)
 * - NONE: 사건 하나를 가리키지 않음 (제도·통계·칼럼 등)
 * draft: FACT일 때만 사건 초안 (아니면 모두 빈 문자열, category OTHER)
 */
export const newsVerdictSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      verdict: z.enum(['PUBLISH', 'HOLD', 'DISMISS']),
      /** 해외 기사만: 한국어 제목 (국내 기사는 빈 문자열) */
      titleKo: z.string(),
      reasonKo: z.string(),
      /** 사건이 실제로 일어난 나라 (기사를 모은 피드의 나라가 아님) */
      eventCountry: z.enum(EVENT_COUNTRY),
      caseEvent: z.enum(['FACT', 'UNCONFIRMED', 'NONE']),
      draft: z.object({
        title: z.string(),
        summary: z.string(),
        category: z.enum(CATEGORY),
        location: z.string(),
      }),
    }),
  ),
});
export type NewsVerdict = z.infer<typeof newsVerdictSchema>['items'][number];
