import { BadRequestException } from '@nestjs/common';

/** case-import 등 도메인 함수가 던지는 일반 Error를 400 + 그 문장으로 바꿈 (HttpException은 그대로) */
export async function asBadRequest<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof Error && !('getStatus' in error)) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
