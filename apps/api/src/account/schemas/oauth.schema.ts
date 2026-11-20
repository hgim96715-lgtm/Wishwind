import { z } from 'zod';

/** 네이버 토큰 응답. 실패하면 200에 error 필드가 옴 */
export const naverTokenSchema = z.object({
  access_token: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

/** 네이버 회원 프로필 조회. id(앱별 고유 식별자)만 씀 */
export const naverProfileSchema = z.object({
  resultcode: z.string(),
  response: z.object({ id: z.string().min(1) }).optional(),
});

export const googleTokenSchema = z.object({
  access_token: z.string().min(1),
});

/** scope=openid만 요청하므로 sub(구글 계정 고유 ID)만 받음 */
export const googleUserInfoSchema = z.object({
  sub: z.string().min(1),
});
