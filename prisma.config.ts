import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // env()는 값이 없으면 config 로딩 자체를 실패시켜 `prisma generate`(빌드 시점, DB
    // 연결 불필요)까지 막아버린다. 실제 런타임 접속 URL은 src/lib/prisma.ts가 따로 읽는다.
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});
