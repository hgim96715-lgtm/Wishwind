import { BadRequestException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { voterIdSchema } from '../voter/voter-id.schema.js';

function readVoterId(ctx: ExecutionContext, required: boolean) {
  const raw = ctx.switchToHttp().getRequest<Request>().headers['x-voter-id'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value && !required) return undefined;
  const parsed = voterIdSchema.safeParse(value);
  if (!parsed.success) throw new BadRequestException('입력값을 확인해 주세요.');
  return parsed.data;
}

/**
 * 브라우저 익명 ID (x-voter-id 헤더, uuid). Next 서버가 httpOnly 쿠키에서 꺼내 넘김.
 * `@VoterId() voterId: string` → 없거나 형식이 틀리면 400
 */
export const VoterId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => readVoterId(ctx, true)!);

/** 첫 방문처럼 쿠키가 아직 없을 수 있는 조회용. 없으면 undefined */
export const OptionalVoterId = createParamDecorator((_: unknown, ctx: ExecutionContext) => readVoterId(ctx, false));
