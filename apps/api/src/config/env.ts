import { z } from 'zod';

/** .env에서 값을 비워 둔 키("KEY=")는 없는 것으로 봄 */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

export const envSchema = z
  .object({
    NODE_ENV: optional(z.enum(['development', 'test', 'production'])),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),

    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    DIRECT_URL: optional(z.url({ protocol: /^postgres(ql)?$/ })),

    ANTHROPIC_API_KEY: optional(z.string().min(1)),
    SUSPECT_PHOTO_COUNTRIES: optional(z.string()),
    SUSPECT_PHOTO_BASE_URL: optional(z.string()),
    SHOW_DRAFTS: z.stringbool().default(false),

    MISSING_SYNC_ENABLED: z.stringbool().default(true),
    MISSING_SYNC_INTERVAL_HOURS: z.coerce.number().min(1).max(168).default(6),
    SAFE182_ESNTL_ID: optional(z.string().min(1)),
    SAFE182_AUTH_KEY: optional(z.string().min(1)),

    NEWS_SYNC_ENABLED: z.stringbool().default(true),
    /** 예약 작업이 새 사건 파일을 넣는 폴더. API가 10분마다 비공개 초안으로 가져옴 */
    CASE_INBOX_DIR: z.string().default('prisma/imports/inbox'),
    NEWS_SYNC_INTERVAL_HOURS: z.coerce.number().min(1).max(48).default(3),
    NEWS_QUERIES: optional(z.string()),
    NEWS_FOREIGN_ENABLED: z.stringbool().default(true),
    PAPAGO_CLIENT_ID: optional(z.string().min(1)),
    PAPAGO_CLIENT_SECRET: optional(z.string().min(1)),

    ADMIN_PASSWORD: optional(z.string().min(12, '12자 이상이어야 합니다')),
    ADMIN_SESSION_SECRET: optional(z.string().min(32, '32자 이상이어야 합니다')),
  })
  .refine((e) => !!e.PAPAGO_CLIENT_ID === !!e.PAPAGO_CLIENT_SECRET, {
    path: ['PAPAGO_CLIENT_SECRET'],
    message: 'PAPAGO_CLIENT_ID와 PAPAGO_CLIENT_SECRET은 둘 다 넣거나 둘 다 비워야 합니다',
  })
  .refine((e) => !!e.ADMIN_PASSWORD === !!e.ADMIN_SESSION_SECRET, {
    path: ['ADMIN_SESSION_SECRET'],
    message: 'ADMIN_PASSWORD와 ADMIN_SESSION_SECRET은 둘 다 넣거나 둘 다 비워야 합니다',
  })
  .refine((e) => !!e.SAFE182_ESNTL_ID === !!e.SAFE182_AUTH_KEY, {
    path: ['SAFE182_AUTH_KEY'],
    message: 'SAFE182_ESNTL_ID와 SAFE182_AUTH_KEY는 둘 다 넣거나 둘 다 비워야 합니다',
  });

export type Env = z.infer<typeof envSchema>;

/**
 * ConfigModule의 validate 훅: 앱이 뜨기 전에 한 번 검사하고, 틀리면 바로 종료.
 * 오류 메시지에는 키 이름과 이유만 넣고 값은 절대 넣지 않음 (로그로 비밀이 새지 않게)
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (result.success) return result.data;
  const lines = result.error.issues.map(
    (i) => `  - ${i.path.join('.') || '(전체)'}: ${i.message}`,
  );
  throw new Error(`환경변수 설정이 올바르지 않습니다 (.env 확인)\n${lines.join('\n')}`);
}
