import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * zod 스키마로 요청 값(body, query, param, header)을 검증·변환하는 파이프.
 * 컨트롤러에서는 `@Body(new ZodPipe(schema))`처럼 스키마만 넘기고, 스키마는 각 모듈의 dto/에 둠
 */
@Injectable()
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (parsed.success) return parsed.data;
    const issue = parsed.error.issues[0];
    // 스키마에 직접 쓴 안내 문장(refine 등)은 그대로 보여 주고, 나머지는 어느 칸인지만 알려 줌
    if (issue?.code === 'custom' && issue.message) throw new BadRequestException(issue.message);
    const where = issue?.path.join('.');
    throw new BadRequestException(
      where ? `입력값을 확인해 주세요 (${where}).` : '입력값을 확인해 주세요.',
    );
  }
}
