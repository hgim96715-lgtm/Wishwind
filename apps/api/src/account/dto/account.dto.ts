import { z } from 'zod';

export const providerSchema = z.enum(['naver', 'google']);
export type ProviderName = z.output<typeof providerSchema>;

/** 로그인 화면으로 보낼 주소 만들기 (state는 Next 서버가 만들어 쿠키에 보관) */
export const authorizeQuerySchema = z.object({
  provider: providerSchema,
  redirectUri: z.url(),
  state: z.string().min(16).max(200),
});
export type AuthorizeQuery = z.output<typeof authorizeQuerySchema>;

/** 로그인 화면에서 돌아온 code를 계정으로 바꾸기 */
export const loginSchema = z.object({
  provider: providerSchema,
  code: z.string().min(1).max(2000),
  state: z.string().min(16).max(200),
  redirectUri: z.url(),
});
export type LoginInput = z.output<typeof loginSchema>;

/** 연락처·링크는 닉네임에 쓸 수 없음 (실종방 캐릭터 닉네임과 같은 규칙) */
const NICKNAME_BAD = /(https?:|www\.|\.com|\.kr|\d{3,}|카톡|오픈채팅|텔레|line|discord)/i;
/** 운영자로 오해할 수 있는 이름 */
const NICKNAME_RESERVED = /(관리자|운영자|운영진|wishwind|위시윈드|admin)/i;

export const nicknameSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(2, '닉네임은 2~10자로 정해 주세요.')
    .max(10, '닉네임은 2~10자로 정해 주세요.')
    .refine((v) => !NICKNAME_BAD.test(v), '연락처나 링크는 닉네임에 쓸 수 없습니다.')
    .refine((v) => !NICKNAME_RESERVED.test(v), '운영자로 오해할 수 있는 닉네임은 쓸 수 없습니다.'),
});
export type NicknameInput = z.output<typeof nicknameSchema>;
