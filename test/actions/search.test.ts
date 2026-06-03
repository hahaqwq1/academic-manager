// 命令面板搜索索引测试 —— 体验层
//
// 补 getSearchIndex 此前无专门测试的空白:验证空库三空数组、
// 作品/项目只取 id+标题、标签 id+名称且按名称升序、字段最小化。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeProject, makeTag, makeWork } from "../helpers/factories";
import { createTestContext, type TestDb } from "../helpers/test-db";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));

import { getSearchIndex } from "@/lib/actions/search";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
});
afterEach(() => ctx.sqlite.close());

describe("getSearchIndex", () => {
  it("空库返回三个空数组", async () => {
    expect(await getSearchIndex()).toEqual({
      works: [],
      projects: [],
      tags: [],
    });
  });

  it("作品/项目取 id+标题;标签取 id+名称并按名称升序", async () => {
    const w = makeWork(ctx.db, { title: "新质生产力研究" });
    const p = makeProject(ctx.db, { title: "国家社科基金项目" });
    // SQLite TEXT 默认 BINARY 排序 = 码点序:丙 U+4E19 < 乙 U+4E59 < 甲 U+7532。
    makeTag(ctx.db, "乙");
    makeTag(ctx.db, "甲");
    makeTag(ctx.db, "丙");

    const idx = await getSearchIndex();
    expect(idx.works).toEqual([{ id: w.id, title: "新质生产力研究" }]);
    expect(idx.projects).toEqual([{ id: p.id, title: "国家社科基金项目" }]);
    expect(idx.tags.map((t) => t.name)).toEqual(["丙", "乙", "甲"]);
    // 字段刻意最小化:标签只含 id + name。
    expect(Object.keys(idx.tags[0]!).sort()).toEqual(["id", "name"]);
  });
});
