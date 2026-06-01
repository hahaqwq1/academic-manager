// 作品查询测试 —— P2-7
//
// 验证 listWorks 的筛选(type/status/q/tagId)、分页、updated_at 倒序、标签填充与多态隔离,
// 以及 getWorkById / listWorksMinimal。用真实临时库跑真实 SQL(LIKE/inArray 子查询/count)。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { createTestContext, type TestDb } from "../helpers/test-db";
import { makeWork, makeTag, tagEntity } from "../helpers/factories";

// vi.mock 被提升到所有 import 之上:工厂里的 getter 每次读 holder.db(beforeEach 换新库)。
const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));

import { listWorks, getWorkById, listWorksMinimal } from "@/db/queries/works";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
});
afterEach(() => ctx.sqlite.close());

describe("listWorks", () => {
  it("空库:零结果且 pageCount=0(非 NaN)", async () => {
    const r = await listWorks();
    expect(r).toMatchObject({ total: 0, page: 1, pageSize: 20, pageCount: 0 });
    expect(r.items).toEqual([]);
  });

  it("缺省分页:page1/size20,pageCount 向上取整", async () => {
    for (let i = 0; i < 25; i++) makeWork(ctx.db, { title: `W${i}` });
    const r = await listWorks();
    expect(r.total).toBe(25);
    expect(r.pageCount).toBe(2);
    expect(r.items).toHaveLength(20);
    const r2 = await listWorks({ page: 2 });
    expect(r2.items).toHaveLength(5);
  });

  it("page/pageSize 非法值回落为 1 / 20", async () => {
    for (let i = 0; i < 30; i++) makeWork(ctx.db, { title: `W${i}` });
    expect((await listWorks({ page: 0 })).page).toBe(1);
    expect((await listWorks({ page: -5 })).page).toBe(1);
    expect((await listWorks({ pageSize: 0 })).pageSize).toBe(20);
    expect((await listWorks({ pageSize: -1 })).pageSize).toBe(20);
  });

  it("type / status 筛选", async () => {
    makeWork(ctx.db, { type: "paper", status: "已发表" });
    makeWork(ctx.db, { type: "paper", status: "写作中" });
    makeWork(ctx.db, { type: "commentary", status: "已发表" });
    expect((await listWorks({ type: "paper" })).total).toBe(2);
    expect((await listWorks({ status: "已发表" })).total).toBe(2);
    expect((await listWorks({ type: "paper", status: "已发表" })).total).toBe(1);
  });

  it("搜索:命中 title 或 summary;空/纯空白 q 被忽略", async () => {
    makeWork(ctx.db, { title: "Machine Learning", summary: "x" });
    makeWork(ctx.db, { title: "其他", summary: "about learning algorithms" });
    makeWork(ctx.db, { title: "无关", summary: "无关" });
    expect((await listWorks({ q: "learning" })).total).toBe(2); // LIKE 对 ASCII 大小写不敏感
    expect((await listWorks({ q: "" })).total).toBe(3);
    expect((await listWorks({ q: "   " })).total).toBe(3);
  });

  it("LIKE 通配符按字面量转义(0-2):% / _ / \\ 不再当通配符", async () => {
    makeWork(ctx.db, { title: "降价50%促销" });
    makeWork(ctx.db, { title: "编号50A促销" }); // 含 50,但非字面 "50%"
    makeWork(ctx.db, { title: "第1_2章" });
    makeWork(ctx.db, { title: "第1X2章" }); // 含 1?2,但非字面 "1_2"
    makeWork(ctx.db, { title: "路径C\\盘" });
    // % 按字面量:只命中真含 "50%" 的
    expect((await listWorks({ q: "50%" })).items.map((w) => w.title)).toEqual([
      "降价50%促销",
    ]);
    // _ 按字面量:只命中真含 "1_2" 的
    expect((await listWorks({ q: "1_2" })).items.map((w) => w.title)).toEqual([
      "第1_2章",
    ]);
    // 反斜杠不破坏查询,按字面量匹配
    expect((await listWorks({ q: "C\\盘" })).items.map((w) => w.title)).toEqual([
      "路径C\\盘",
    ]);
    // 裸 % 不再匹配全部:只命中标题里真含 "%" 的那一条
    expect((await listWorks({ q: "%" })).items.map((w) => w.title)).toEqual([
      "降价50%促销",
    ]);
  });

  it("tagId 子查询筛选;不存在的标签 → 零结果", async () => {
    const w1 = makeWork(ctx.db, { title: "A" });
    const w2 = makeWork(ctx.db, { title: "B" });
    makeWork(ctx.db, { title: "C" });
    const tag = makeTag(ctx.db, "精选");
    tagEntity(ctx.db, "work", w1.id, tag.id);
    tagEntity(ctx.db, "work", w2.id, tag.id);
    expect((await listWorks({ tagId: tag.id })).total).toBe(2);
    expect((await listWorks({ tagId: 9999 })).total).toBe(0);
  });

  it("status + tagId 组合", async () => {
    const w1 = makeWork(ctx.db, { title: "A", status: "已发表" });
    const w2 = makeWork(ctx.db, { title: "B", status: "写作中" });
    const tag = makeTag(ctx.db, "T");
    tagEntity(ctx.db, "work", w1.id, tag.id);
    tagEntity(ctx.db, "work", w2.id, tag.id);
    const r = await listWorks({ status: "已发表", tagId: tag.id });
    expect(r.total).toBe(1);
    expect(r.items[0].id).toBe(w1.id);
  });

  it("按 updated_at 倒序", async () => {
    makeWork(ctx.db, { title: "旧", updated_at: "2025-01-01T00:00:00.000Z" });
    makeWork(ctx.db, { title: "新", updated_at: "2025-03-01T00:00:00.000Z" });
    makeWork(ctx.db, { title: "中", updated_at: "2025-02-01T00:00:00.000Z" });
    const r = await listWorks();
    expect(r.items.map((w) => w.title)).toEqual(["新", "中", "旧"]);
  });

  it("填充标签且仅取 entity_type='work'(排除同 id 的 project 标签)", async () => {
    const w = makeWork(ctx.db, { title: "A" });
    const t1 = makeTag(ctx.db, "标签1");
    const t2 = makeTag(ctx.db, "标签2");
    tagEntity(ctx.db, "work", w.id, t1.id);
    tagEntity(ctx.db, "work", w.id, t2.id);
    // 同 id 的 project 标签必须被排除。
    tagEntity(ctx.db, "project", w.id, t1.id);
    const r = await listWorks();
    expect(r.items[0].tags.map((t) => t.name).sort()).toEqual(["标签1", "标签2"]);
  });

  it("无标签作品 tags 为 []", async () => {
    makeWork(ctx.db, { title: "A" });
    const r = await listWorks();
    expect(r.items[0].tags).toEqual([]);
  });
});

describe("getWorkById", () => {
  it("存在:返回作品 + 标签", async () => {
    const w = makeWork(ctx.db, { title: "目标" });
    const tag = makeTag(ctx.db, "X");
    tagEntity(ctx.db, "work", w.id, tag.id);
    const got = await getWorkById(w.id);
    expect(got?.title).toBe("目标");
    expect(got?.tags.map((t) => t.name)).toEqual(["X"]);
  });

  it("不存在:返回 null", async () => {
    expect(await getWorkById(123)).toBeNull();
  });
});

describe("listWorksMinimal", () => {
  it("返回精简字段,按 updated_at 倒序", async () => {
    makeWork(ctx.db, { title: "旧", updated_at: "2025-01-01T00:00:00.000Z" });
    makeWork(ctx.db, { title: "新", updated_at: "2025-09-01T00:00:00.000Z" });
    const list = await listWorksMinimal();
    expect(list.map((w) => w.title)).toEqual(["新", "旧"]);
    expect(Object.keys(list[0]).sort()).toEqual(
      ["id", "published_at", "status", "title", "type"].sort()
    );
  });
});
