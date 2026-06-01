// 导出查询测试 —— P2-7
//
// getAllWorksForExport(按 published_at 倒序,NULL 排最后)、
// getProjectsWithOutputs(每项目嵌套成果,精简投影)、getDatabaseDump(六表整库快照)。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { createTestContext, type TestDb } from "../helpers/test-db";
import {
  makeWork,
  makeProject,
  makeSubmission,
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

import {
  getAllWorksForExport,
  getProjectsWithOutputs,
  getDatabaseDump,
} from "@/db/queries/export";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
});
afterEach(() => ctx.sqlite.close());

describe("getAllWorksForExport", () => {
  it("按 published_at 倒序,NULL 排最后", async () => {
    makeWork(ctx.db, { title: "2024", published_at: "2024-01-01" });
    makeWork(ctx.db, { title: "2025", published_at: "2025-06-01" });
    makeWork(ctx.db, { title: "未发表", published_at: null });
    const list = await getAllWorksForExport();
    expect(list.map((w) => w.title)).toEqual(["2025", "2024", "未发表"]);
  });
});

describe("getProjectsWithOutputs", () => {
  it("每项目嵌套成果,投影为精简字段;一篇作品可挂多个项目", async () => {
    const p1 = makeProject(ctx.db, { title: "P1", updated_at: "2025-02-01T00:00:00.000Z" });
    const p2 = makeProject(ctx.db, { title: "P2", updated_at: "2025-01-01T00:00:00.000Z" });
    const shared = makeWork(ctx.db, {
      title: "共享成果",
      authors: "示例作者",
      published_at: "2025-01-01",
    });
    const only2 = makeWork(ctx.db, { title: "P2专属", published_at: "2024-01-01" });
    linkOutput(ctx.db, p1.id, shared.id);
    linkOutput(ctx.db, p2.id, shared.id);
    linkOutput(ctx.db, p2.id, only2.id);

    const list = await getProjectsWithOutputs();
    // 项目按 updated_at 倒序:P1 在前。
    expect(list.map((p) => p.title)).toEqual(["P1", "P2"]);
    const p1Out = list[0];
    expect(p1Out.outputs.map((o) => o.title)).toEqual(["共享成果"]);
    // 投影只含这些键。
    expect(Object.keys(p1Out.outputs[0]).sort()).toEqual(
      ["authors", "published_at", "status", "title", "type"].sort()
    );
    // P2 含两条,按 works.published_at 倒序(2025 在 2024 前)。
    expect(list[1].outputs.map((o) => o.title)).toEqual(["共享成果", "P2专属"]);
  });

  it("无成果项目 outputs 为 []", async () => {
    makeProject(ctx.db, { title: "空项目" });
    const list = await getProjectsWithOutputs();
    expect(list[0].outputs).toEqual([]);
  });

  it("同发表日期(并列)的成果按 work_id 升序确定排序(P3-10 对抗审查)", async () => {
    const p = makeProject(ctx.db, { title: "P" });
    const w1 = makeWork(ctx.db, { title: "W1", published_at: "2024-01-01" });
    const w2 = makeWork(ctx.db, { title: "W2", published_at: "2024-01-01" });
    const w3 = makeWork(ctx.db, { title: "W3", published_at: "2024-01-01" });
    // 乱序挂接(w3→w1→w2),但分组内输出应按 work_id 升序,与查询计划无关。
    linkOutput(ctx.db, p.id, w3.id);
    linkOutput(ctx.db, p.id, w1.id);
    linkOutput(ctx.db, p.id, w2.id);
    const [proj] = await getProjectsWithOutputs();
    expect(proj.outputs.map((o) => o.title)).toEqual(["W1", "W2", "W3"]);
  });
});

describe("getDatabaseDump", () => {
  it("六张表键齐全且含全部行", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    const p = makeProject(ctx.db, { title: "P" });
    makeSubmission(ctx.db, w.id, { round: 1 });
    const tag = makeTag(ctx.db, "T");
    tagEntity(ctx.db, "work", w.id, tag.id);
    linkOutput(ctx.db, p.id, w.id);
    const dump = await getDatabaseDump();
    expect(Object.keys(dump).sort()).toEqual(
      ["entity_tags", "project_outputs", "projects", "submissions", "tags", "works"].sort()
    );
    expect(dump.works).toHaveLength(1);
    expect(dump.projects).toHaveLength(1);
    expect(dump.submissions).toHaveLength(1);
    expect(dump.tags).toHaveLength(1);
    expect(dump.entity_tags).toHaveLength(1);
    expect(dump.project_outputs).toHaveLength(1);
  });
});
