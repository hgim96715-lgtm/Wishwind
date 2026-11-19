import { z } from 'zod';

/** 브라우저 익명 ID. Next 서버가 httpOnly 쿠키에서 꺼내 x-voter-id 헤더로 넘김 */
export const voterIdSchema = z.uuid();
