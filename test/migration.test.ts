// 迁移测试 —— P2-7
//
// 空库按 drizzle/*.sql 全量迁移后,应得到 spec 第四节的 6 张表,以及关键索引
//(尤其是 0001 引入的 (work_id,round) 唯一索引,P0-2 的防重复轮次约束)。
// 这同时是测试基建(test-db helper)的冒烟验证:helper 跑不通这里会第一时间红。
import { describe, expect, it } from "vitest";

import { createTestSqlite, migrationTags } from "./helpers/test-db";

describe("数据库迁移", () => {
  it("空库迁移后 6 张业务表全部就位", () => {
    const sqlite = createTestSqlite();
    const rows = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'",
      )
      .all() as { name: string }[];
    const tables = rows.map((r) => r.name).sort();

    expect(tables).toEqual(
      [
        "entity_tags",
        "project_outputs",
        "projects",
        "submissions",
        "tags",
        "works",
      ].sort(),
    );
    sqlite.close();
  });

  it("关键索引就位:投稿(work_id,round)唯一索引等", () => {
    const sqlite = createTestSqlite();
    const rows = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='index'")
      .all() as { name: string }[];
    const indexes = rows.map((r) => r.name);

    // 0001 引入的防重复轮次唯一索引(P0-2)。
    expect(indexes).toContain("submissions_work_round_idx");
    // 0000 的其余关键索引抽样。
    expect(indexes).toContain("works_status_idx");
    expect(indexes).toContain("tags_name_unique");
    expect(indexes).toContain("project_outputs_unique_idx");
    expect(indexes).toContain("entity_tags_unique_idx");
    sqlite.close();
  });

  it("(work_id,round) 唯一索引实际拦截重复轮次", () => {
    const sqlite = createTestSqlite();
    sqlite
      .prepare(
        "INSERT INTO works (type,title,status,created_at,updated_at) VALUES (?,?,?,?,?)",
      )
      .run(
        "paper",
        "T",
        "投稿中",
        "2025-01-01T00:00:00.000Z",
        "2025-01-01T00:00:00.000Z",
      );
    const insertSub = sqlite.prepare(
      "INSERT INTO submissions (work_id,journal,round,status,submitted_at) VALUES (?,?,?,?,?)",
    );
    insertSub.run(1, "刊A", 1, "在审", "2025-01-01");
    // 同一作品同一轮次再插一条 → 唯一约束应抛错。
    expect(() => insertSub.run(1, "刊B", 1, "退修", "2025-02-01")).toThrow(
      /UNIQUE/i,
    );
    sqlite.close();
  });

  it("journal 至少含一条迁移", () => {
    expect(migrationTags().length).toBeGreaterThanOrEqual(2);
  });
});
