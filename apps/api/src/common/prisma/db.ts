import type { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

/**
 * repository 메서드가 받는 DB 핸들. 평소에는 PrismaService, 트랜잭션 안에서는 tx를 넘김.
 * service가 `prisma.$transaction(tx => repo.x(..., tx))`로 여러 저장을 묶을 수 있게 하기 위함
 */
export type Db = PrismaService | Prisma.TransactionClient;
