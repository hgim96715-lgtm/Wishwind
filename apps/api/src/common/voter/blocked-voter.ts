import { ForbiddenException } from '@nestjs/common';
import type { Db } from '../prisma/db.js';

export const BLOCKED_MESSAGE = '운영 정책에 따라 글을 남길 수 없는 상태입니다. 문의하기로 알려 주세요.';

/** 관리자가 참여를 제한한 브라우저(익명 ID)는 글·구름·투표를 남길 수 없음 */
export async function assertNotBlocked(db: Db, voterId: string) {
  const blocked = await db.blockedVoter.findUnique({
    where: { voterId },
    select: { voterId: true },
  });
  if (blocked) throw new ForbiddenException(BLOCKED_MESSAGE);
}
