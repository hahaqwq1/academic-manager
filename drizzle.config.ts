import path from "node:path";

import { defineConfig } from "drizzle-kit";

// 与 src/db/index.ts 保持一致:数据库路径由 DATA_DIR 决定,默认 ./data。
const DATA_DIR = process.env.DATA_DIR ?? "./data";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: path.join(DATA_DIR, "app.db"),
  },
});
