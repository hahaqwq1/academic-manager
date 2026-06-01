import "server-only";

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

// 数据目录走环境变量,本地默认 ./data;上 VPS 时把 DATA_DIR 指向挂载卷即可,代码不动。
export const DATA_DIR = process.env.DATA_DIR ?? "./data";
export const DB_PATH = path.join(DATA_DIR, "app.db");

function createConn() {
  // 首次运行自动创建数据目录;只读卷 / 权限不足时给出可读报错而非裸崩溃(P3-12)。
  if (!existsSync(DATA_DIR)) {
    try {
      mkdirSync(DATA_DIR, { recursive: true });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `无法创建数据目录 ${DATA_DIR}(${reason})。请确认 DATA_DIR 指向一个可写位置。`
      );
    }
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL"); // 并发读写更稳
  sqlite.pragma("busy_timeout = 30000"); // 写锁竞争时最多等 30s 再报 SQLITE_BUSY(P3-12)
  sqlite.pragma("foreign_keys = ON"); // 启用外键级联约束

  // 原生句柄与 drizzle 实例一并返回:启动备份 / 完整性自检需要原生 .backup() 与 PRAGMA(0-1)。
  return { sqlite, db: drizzle(sqlite, { schema }) };
}

// 模块级单例:避免 dev 热重载重复实例化导致 "database is locked"
const globalForDb = globalThis as unknown as {
  conn?: ReturnType<typeof createConn>;
};

const conn = globalForDb.conn ?? createConn();

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = conn.db;
// 原生 better-sqlite3 句柄:仅供备份 / 维护等需要 PRAGMA 与在线 .backup() 的服务端场景。
export const sqlite = conn.sqlite;
