import "server-only";

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

// 数据目录走环境变量,本地默认 ./data;上 VPS 时把 DATA_DIR 指向挂载卷即可,代码不动。
const DATA_DIR = process.env.DATA_DIR ?? "./data";
const DB_PATH = path.join(DATA_DIR, "app.db");

function createDb() {
  // 首次运行自动创建数据目录
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL"); // 并发读写更稳
  sqlite.pragma("foreign_keys = ON"); // 启用外键级联约束

  return drizzle(sqlite, { schema });
}

// 模块级单例:避免 dev 热重载重复实例化导致 "database is locked"
const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof createDb>;
};

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
