// 标签查询测试 —— P2-7
//
// listAllTags(名称升序)、listTagsWithCounts(作品/项目引用计数)、
// getEntitiesByTag(某标签下的作品与项目;不存在返回 null)。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { createTestContext, type TestDb } from "../helpers/test-db";
import {
  makeWork,
  makeProject,
  makeTag,
  tagEntity,
} from "../helpers/factories";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));

import {
  listAllTags,
  listTagsWithCounts,
  getEntitiesByTag,
} from "@/db/queries/tags";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
});
afterEach(() => ctx.sqlite.close());

describe("listAllTags", () => {
  it("按名称升序(SQLite 二进制/码点序)", async () => {
    // SQLite TEXT 默认 BINARY 排序 = UTF-8 字节序,对 BMP 即 Unicode 码点序。
    // 丙 U+4E19 < 乙 U+4E59 < 甲 U+7532。
    makeTag(ctx.db, "乙");
    makeTag(ctx.db, "甲");
    makeTag(ctx.db, "丙");
    expect((await listAllTags()).map((t) => t.name)).toEqual([
      "丙",
      "乙",
      "甲",
    ]);
  });
});

describe("listTagsWithCounts", () => {
  it("各标签的作品/项目引用计数;未用标签计 0", async () => {
    const w1 = makeWork(ctx.db, { title: "W1" });
    const w2 = makeWork(ctx.db, { title: "W2" });
    const p1 = makeProject(ctx.db, { title: "P1" });
    const a = makeTag(ctx.db, "A");
    const b = makeTag(ctx.db, "B");
    makeTag(ctx.db, "C"); // 未使用
    tagEntity(ctx.db, "work", w1.id, a.id);
    tagEntity(ctx.db, "work", w2.id, a.id);
    tagEntity(ctx.db, "project", p1.id, a.id);
    tagEntity(ctx.db, "project", p1.id, b.id);
    const counts = Object.fromEntries(
      (await listTagsWithCounts()).map((t) => [t.name, t]),
    );
    expect(counts["A"]).toMatchObject({ workCount: 2, projectCount: 1 });
    expect(counts["B"]).toMatchObject({ workCount: 0, projectCount: 1 });
    expect(counts["C"]).toMatchObject({ workCount: 0, projectCount: 0 });
  });

  it("空库返回 []", async () => {
    expect(await listTagsWithCounts()).toEqual([]);
  });
});

describe("getEntitiesByTag", () => {
  it("返回该标签下的作品与项目", async () => {
    const w = makeWork(ctx.db, { title: "命中作品" });
    const p = makeProject(ctx.db, { title: "命中项目" });
    const other = makeWork(ctx.db, { title: "无关作品" });
    const tag = makeTag(ctx.db, "主题");
    tagEntity(ctx.db, "work", w.id, tag.id);
    tagEntity(ctx.db, "project", p.id, tag.id);
    void other;
    const got = await getEntitiesByTag(tag.id);
    expect(got?.tag.name).toBe("主题");
    expect(got?.works.map((x) => x.title)).toEqual(["命中作品"]);
    expect(got?.projects.map((x) => x.title)).toEqual(["命中项目"]);
  });

  it("标签不存在返回 null", async () => {
    expect(await getEntitiesByTag(999)).toBeNull();
  });
});
