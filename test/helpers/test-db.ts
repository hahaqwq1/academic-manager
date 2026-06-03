// 测试用临时数据库 helper —— P2-7
//
// 为什么这样做:
// - 生产代码里 `@/db`(src/db/index.ts)顶部 `import "server-only"`,在 vitest(node 环境)
//   下一旦被 import 即抛错。因此 DB 相关测试统一用 `vi.mock("@/db")` 把单例替换成本 helper
//   产出的「内存 better-sqlite3 + drizzle」实例,既绕开 server-only,又拿到真实可写的库。
// - 建表方式刻意复用真实迁移 SQL(drizzle/*.sql),而非 schema.ts 现造表:这样测试覆盖的就是
//   线上 `db:migrate` 实际产生的结构(含 0001 的 (work_id,round) 唯一索引),迁移漂移能被测出。
// - 用 `:memory:` 库:零文件锁、天然隔离,每个测试文件一份,跑完即弃。
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";

import * as schema from "@/db/schema";

// drizzle 迁移产物目录(仓库根下的 drizzle/);vitest 以仓库根为 cwd 运行。
const DRIZZLE_DIR = path.join(process.cwd(), "drizzle");

// 读 _journal.json,按 idx 升序返回迁移 tag 列表(未来新增迁移自动纳入)。
export function migrationTags(): string[] {
  const journalPath = path.join(DRIZZLE_DIR, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: { idx: number; tag: string }[];
  };
  return [...journal.entries]
    .sort((a, b) => a.idx - b.idx)
    .map((entry) => entry.tag);
}

// 把全部迁移按顺序应用到给定连接上。
// drizzle 的 `--> statement-breakpoint` 以 `--` 开头本就是 SQL 注释,better-sqlite3 的
// exec() 能一次性跑完整文件(`;` 分隔、注释忽略),无需手工切分。
export function applyMigrations(sqlite: Database.Database): void {
  for (const tag of migrationTags()) {
    const sql = readFileSync(path.join(DRIZZLE_DIR, `${tag}.sql`), "utf8");
    sqlite.exec(sql);
  }
}

// 建一个跑好全部迁移的内存 better-sqlite3 连接(外键级联开启,与生产/seed 一致)。
export function createTestSqlite(): Database.Database {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  applyMigrations(sqlite);
  return sqlite;
}

// 建一个 drizzle 实例(绑定真实 schema)。供 `vi.mock("@/db")` 工厂返回。
export function createTestDb() {
  return drizzle(createTestSqlite(), { schema });
}

export type TestDb = ReturnType<typeof createTestDb>;

// 同时返回底层 sqlite 句柄,便于 afterEach 关闭释放。
// DB 测试文件在 beforeEach 里取一份全新 context:迁移好的空内存库,
// 天然隔离、自增 id 从 1 起,免去手工清表与重置 sqlite_sequence。
export interface TestContext {
  db: TestDb;
  sqlite: Database.Database;
}

export function createTestContext(): TestContext {
  const sqlite = createTestSqlite();
  return { db: drizzle(sqlite, { schema }), sqlite };
}
