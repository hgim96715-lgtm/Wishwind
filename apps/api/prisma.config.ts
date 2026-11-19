import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // 마이그레이션은 풀러를 거치지 않는 Direct 연결을 사용합니다.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
