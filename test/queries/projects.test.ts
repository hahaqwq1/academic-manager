// 项目查询测试 —— P2-7
//
// listProjects 筛选(level/status/q over title+notes+grant_no/tagId)+ 分页 + 倒序 + 标签填充;
// getProjectById 带标签与已挂接成果(project_outputs→works),不存在返回 null。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { createTestContext, type TestDb } from "../helpers/test-db";
import {
  makeProject,
  makeWork,
  makeTag,
  tagEntity,
  linkOutput,
} from "../helpers/factories";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));

import { listProjects, getProjectById } from "@/db/queries/projects";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
});
afterEach(() => ctx.sqlite.close());

describe("listProjects", () => {
  it("空库零结果", async () => {
    const r = await listProjects();
    expect(r).toMatchObject({ total: 0, pageCount: 0 });
    expect(r.items).toEqual([]);
  });

  it("level / status 筛选", async () => {
    makeProject(ctx.db, { level: "国家级", status: "已立项" });
    makeProject(ctx.db, { level: "国家级", status: "结题中" });
    makeProject(ctx.db, { level: "校级", status: "已立项" });
    expect((await listProjects({ level: "国家级" })).total).toBe(2);
    expect((await listProjects({ status: "已立项" })).total).toBe(2);
    expect((await listProjects({ level: "国家级", status: "结题中" })).total).toBe(1);
  });

  it("搜索覆盖 title / notes / grant_no", async () => {
    makeProject(ctx.db, { title: "新质生产力研究" });
    makeProject(ctx.db, { title: "其他", notes: "含新质关键词" });
    makeProject(ctx.db, { title: "再其他", grant_no: "新质-001" });
    makeProject(ctx.db, { title: "无关", notes: "无关", grant_no: "X" });
    expect((await listProjects({ q: "新质" })).total).toBe(3);
  });

  it("tagId 筛选(仅 entity_type='project')", async () => {
    const p1 = makeProject(ctx.db, { title: "A" });
    makeProject(ctx.db, { title: "B" });
    const tag = makeTag(ctx.db, "重点");
    tagEntity(ctx.db, "project", p1.id, tag.id);
    // 同 id 的 work 标签不应影响项目筛选。
    tagEntity(ctx.db, "work", p1.id, tag.id);
    const r = await listProjects({ tagId: tag.id });
    expect(r.total).toBe(1);
    expect(r.items[0].id).toBe(p1.id);
  });

  it("按 updated_at 倒序 + 标签填充", async () => {
    const p1 = makeProject(ctx.db, { title: "旧", updated_at: "2025-01-01T00:00:00.000Z" });
    makeProject(ctx.db, { title: "新", updated_at: "2025-06-01T00:00:00.000Z" });
    const tag = makeTag(ctx.db, "T");
    tagEntity(ctx.db, "project", p1.id, tag.id);
    const r = await listProjects();
    expect(r.items.map((p) => p.title)).toEqual(["新", "旧"]);
    const old = r.items.find((p) => p.title === "旧");
    expect(old?.tags.map((t) => t.name)).toEqual(["T"]);
  });
});

describe("getProjectById", () => {
  it("返回项目 + 标签 + 已挂接成果", async () => {
    const p = makeProject(ctx.db, { title: "目标项目" });
    const tag = makeTag(ctx.db, "标");
    tagEntity(ctx.db, "project", p.id, tag.id);
    const w1 = makeWork(ctx.db, { title: "成果1", updated_at: "2025-01-01T00:00:00.000Z" });
    const w2 = makeWork(ctx.db, { title: "成果2", updated_at: "2025-05-01T00:00:00.000Z" });
    linkOutput(ctx.db, p.id, w1.id);
    linkOutput(ctx.db, p.id, w2.id);
    const got = await getProjectById(p.id);
    expect(got?.title).toBe("目标项目");
    expect(got?.tags.map((t) => t.name)).toEqual(["标"]);
    // 成果按 works.updated_at 倒序。
    expect(got?.outputs.map((o) => o.title)).toEqual(["成果2", "成果1"]);
  });

  it("不存在返回 null", async () => {
    expect(await getProjectById(999)).toBeNull();
  });
});
