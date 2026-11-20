import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // '사건 파일 올리기'로 사건 여러 건을 한 번에 받으므로 기본(100kb)보다 크게
  app.useBodyParser('json', { limit: '2mb' });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
