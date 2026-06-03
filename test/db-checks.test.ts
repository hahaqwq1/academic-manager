// DB 层 CHECK 约束测试 —— 升级线(数据完整性)
//
// 0002 迁移给 6 张表里有约束的列加了 CHECK:枚举白名单、round>=1、word_count>=0、跨字段日期顺序。
// 这是「绕过 zod 的最后一道闸」——故意用原生 sqlite 直插坏值(TS 类型层拦不到的),断言被 DB 拒。
// 关键:test-db helper 是回放 drizzle/*.sql(而非 schema.ts),所以这里测的就是真实迁移产物;
// 若约束没落进迁移 SQL,这里会第一时间红。
import type Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestSqlite } from "./helpers/test-db";

const TS = "2025-01-01T00:00:00.000Z";

let sqlite: Database.Database;
beforeEach(() => {
  sqlite = createTestSqlite();
});
afterEach(() => sqlite.close());

// 便捷插入:各表必填列的最小有效行,允许覆盖个别列以制造坏值。
function insertWork(over: Record<string, unknown> = {}): void {
  const row = {
    type: "paper",
    title: "T",
    status: "构思",
    author_role: null,
    word_count: null,
    published_at: null,
    created_at: TS,
    updated_at: TS,
    ...over,
  };
  sqlite
    .prepare(
      "INSERT INTO works (type,title,status,author_role,word_count,published_at,created_at,updated_at) VALUES (@type,@title,@status,@author_role,@word_count,@published_at,@created_at,@updated_at)",
    )
    .run(row);
}

function insertProject(over: Record<string, unknown> = {}): void {
  const row = {
    title: "P",
    level: "校级",
    role: "主持",
    status: "已立项",
    start_date: null,
    end_date: null,
    created_at: TS,
    updated_at: TS,
    ...over,
  };
  sqlite
    .prepare(
      "INSERT INTO projects (title,level,role,status,start_date,end_date,created_at,updated_at) VALUES (@title,@level,@role,@status,@start_date,@end_date,@created_at,@updated_at)",
    )
    .run(row);
}

function insertSubmission(over: Record<string, unknown> = {}): void {
  const row = {
    work_id: 1,
    journal: "刊A",
    round: 1,
    status: "在审",
    submitted_at: "2025-01-01",
    decided_at: null,
    ...over,
  };
  sqlite
    .prepare(
      "INSERT INTO submissions (work_id,journal,round,status,submitted_at,decided_at) VALUES (@work_id,@journal,@round,@status,@submitted_at,@decided_at)",
    )
    .run(row);
}

const CHECK = /CHECK constraint failed/i;

describe("works CHECK", () => {
  it("type 必在白名单内", () => {
    expect(() => insertWork({ type: "bogus" })).toThrow(CHECK);
    expect(() => insertWork({ type: "paper" })).not.toThrow();
  });
  it("status 必在白名单内", () => {
    expect(() => insertWork({ status: "不存在" })).toThrow(
      /works_status_check|CHECK/i,
    );
    expect(() => insertWork({ status: "已发表" })).not.toThrow();
  });
  it("author_role 可空,但非空时必在白名单内", () => {
    expect(() => insertWork({ author_role: null })).not.toThrow();
    expect(() => insertWork({ author_role: "独著" })).not.toThrow();
    expect(() => insertWork({ author_role: "打杂" })).toThrow(CHECK);
  });
  it("word_count 可空 / 0 合法,负数被拒", () => {
    expect(() => insertWork({ word_count: null })).not.toThrow();
    expect(() => insertWork({ word_count: 0 })).not.toThrow();
    expect(() => insertWork({ word_count: -1 })).toThrow(CHECK);
  });
});

describe("projects CHECK", () => {
  it("level / role / status 枚举白名单", () => {
    expect(() => insertProject({ level: "宇宙级" })).toThrow(CHECK);
    expect(() => insertProject({ role: "围观" })).toThrow(CHECK);
    expect(() => insertProject({ status: "随便" })).toThrow(CHECK);
    expect(() => insertProject({})).not.toThrow();
  });
  it("跨字段日期:end < start 被拒;等值 / 单边 / 都空 合法", () => {
    expect(() =>
      insertProject({ start_date: "2024-12-31", end_date: "2024-01-01" }),
    ).toThrow(/projects_date_order_check|CHECK/i);
    expect(() =>
      insertProject({ start_date: "2024-01-01", end_date: "2024-01-01" }),
    ).not.toThrow();
    expect(() =>
      insertProject({ start_date: "2024-01-01", end_date: null }),
    ).not.toThrow();
    expect(() =>
      insertProject({ start_date: null, end_date: "2024-01-01" }),
    ).not.toThrow();
  });
});

describe("submissions CHECK", () => {
  beforeEach(() => insertWork()); // work_id=1 供外键引用
  it("status 枚举白名单", () => {
    expect(() => insertSubmission({ status: "瞎填" })).toThrow(CHECK);
    expect(() => insertSubmission({ status: "录用" })).not.toThrow();
  });
  it("round >= 1", () => {
    expect(() => insertSubmission({ round: 0 })).toThrow(
      /submissions_round_check|CHECK/i,
    );
    expect(() => insertSubmission({ round: 1 })).not.toThrow();
  });
  it("跨字段日期:decided < submitted 被拒;等值 / 空 合法", () => {
    // 各成功插入用不同 round,避开 (work_id,round) 唯一索引(与日期约束无关)。
    expect(() =>
      insertSubmission({
        round: 1,
        submitted_at: "2024-02-01",
        decided_at: "2024-01-01",
      }),
    ).toThrow(/submissions_date_order_check|CHECK/i);
    expect(() =>
      insertSubmission({
        round: 2,
        submitted_at: "2024-01-01",
        decided_at: "2024-01-01",
      }),
    ).not.toThrow();
    expect(() =>
      insertSubmission({
        round: 3,
        submitted_at: "2024-01-01",
        decided_at: null,
      }),
    ).not.toThrow();
  });
});

describe("entity_tags CHECK", () => {
  beforeEach(() => {
    insertWork(); // entity_id=1 → work
    sqlite.prepare("INSERT INTO tags (name) VALUES ('t')").run(); // tag_id=1
  });
  function insertEntityTag(entity_type: string): void {
    sqlite
      .prepare(
        "INSERT INTO entity_tags (entity_type,entity_id,tag_id) VALUES (?,?,?)",
      )
      .run(entity_type, 1, 1);
  }
  it("entity_type 必为 work | project", () => {
    expect(() => insertEntityTag("bogus")).toThrow(CHECK);
    expect(() => insertEntityTag("work")).not.toThrow();
    expect(() => insertEntityTag("project")).not.toThrow();
  });
});

describe("works DOI 唯一索引(0003)", () => {
  function insertWorkWithDoi(doi: string | null): void {
    sqlite
      .prepare(
        "INSERT INTO works (type,title,status,doi,created_at,updated_at) VALUES (?,?,?,?,?,?)",
      )
      .run("paper", "T", "构思", doi, TS, TS);
  }
  it("非空 DOI 唯一,重复被拒", () => {
    insertWorkWithDoi("10.1000/abc");
    expect(() => insertWorkWithDoi("10.1000/abc")).toThrow(/UNIQUE/i);
  });
  it("多个未填(NULL)DOI 互不冲突", () => {
    expect(() => {
      insertWorkWithDoi(null);
      insertWorkWithDoi(null);
    }).not.toThrow();
  });
});

describe("projects 经费 CHECK(0003)", () => {
  function insertProjectFunding(
    funding_amount: number | null,
    funding_currency: string | null = "元",
  ): void {
    sqlite
      .prepare(
        "INSERT INTO projects (title,level,role,status,funding_amount,funding_currency,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
      )
      .run(
        "P",
        "校级",
        "主持",
        "已立项",
        funding_amount,
        funding_currency,
        TS,
        TS,
      );
  }
  it("funding_amount 可空 / 0 / 正数 合法,负数被拒", () => {
    expect(() => insertProjectFunding(null)).not.toThrow();
    expect(() => insertProjectFunding(0)).not.toThrow();
    expect(() => insertProjectFunding(12.5)).not.toThrow();
    expect(() => insertProjectFunding(-1)).toThrow(
      /funding_amount_check|CHECK/i,
    );
  });
  it("funding_currency 必在白名单内", () => {
    expect(() => insertProjectFunding(10, "元")).not.toThrow();
    expect(() => insertProjectFunding(10, "万元")).not.toThrow();
    expect(() => insertProjectFunding(10, "卢比")).toThrow(
      /funding_currency_check|CHECK/i,
    );
  });
});
