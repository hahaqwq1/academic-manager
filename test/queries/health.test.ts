// 数据健康中心查询测试 —— 升级线(数据完整性 + 体验层)
//
// 覆盖 5 类「DB 允许但口径/语义可疑」的检查,以及汇总报告的计数与空态。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  makeProject,
  makeSubmission,
  makeTag,
  makeWork,
  tagEntity,
} from "../helpers/factories";
import { createTestContext, type TestDb } from "../helpers/test-db";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));

import {
  findDatedNotPublished,
  findOrphanEntityTags,
  findPublishedMissingDate,
  findSubmissionsDecidedButPending,
  findWorksSubmittingNoSubmission,
  getHealthReport,
} from "@/db/queries/health";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
});
afterEach(() => {
  ctx.sqlite.close();
});

describe("findPublishedMissingDate", () => {
  it("只挑『已发表且无发表日期』", () => {
    const a = makeWork(ctx.db, {
      title: "缺日期1",
      status: "已发表",
      published_at: null,
    });
    makeWork(ctx.db, {
      title: "有日期",
      status: "已发表",
      published_at: "2024-01-01",
    });
    makeWork(ctx.db, {
      title: "写作中无日期",
      status: "写作中",
      published_at: null,
    });
    const rows = findPublishedMissingDate();
    expect(rows.map((r) => r.id)).toEqual([a.id]);
    expect(rows[0]).toMatchObject({ kind: "work", title: "缺日期1" });
  });
});

describe("findDatedNotPublished", () => {
  it("只挑『有发表日期但状态非已发表』,并附当前状态", () => {
    const a = makeWork(ctx.db, {
      title: "投稿中带日期",
      status: "投稿中",
      published_at: "2025-01-01",
    });
    makeWork(ctx.db, {
      title: "已发表带日期",
      status: "已发表",
      published_at: "2024-01-01",
    });
    makeWork(ctx.db, {
      title: "写作中无日期",
      status: "写作中",
      published_at: null,
    });
    const rows = findDatedNotPublished();
    expect(rows.map((r) => r.id)).toEqual([a.id]);
    expect(rows[0]!.detail).toBe("当前状态:投稿中");
  });
});

describe("findWorksSubmittingNoSubmission", () => {
  it("状态=投稿中 且无任何投稿记录才算", () => {
    const orphan = makeWork(ctx.db, {
      title: "投稿中没投稿",
      status: "投稿中",
    });
    const withSub = makeWork(ctx.db, {
      title: "投稿中有投稿",
      status: "投稿中",
    });
    makeSubmission(ctx.db, withSub.id, { round: 1 });
    makeWork(ctx.db, { title: "写作中", status: "写作中" });
    const rows = findWorksSubmittingNoSubmission();
    expect(rows.map((r) => r.id)).toEqual([orphan.id]);
  });
});

describe("findSubmissionsDecidedButPending", () => {
  it("投稿 status=在审 但 decided_at 已填", () => {
    const w = makeWork(ctx.db, { title: "W" });
    makeSubmission(ctx.db, w.id, {
      round: 1,
      status: "在审",
      decided_at: "2024-02-01",
    }); // 命中
    makeSubmission(ctx.db, w.id, {
      round: 2,
      status: "在审",
      decided_at: null,
    }); // 正常在审,不算
    makeSubmission(ctx.db, w.id, {
      round: 3,
      status: "录用",
      decided_at: "2024-03-01",
    }); // 已更新状态,不算
    const rows = findSubmissionsDecidedButPending();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: "work",
      id: w.id,
      title: "W",
      detail: "投稿:某刊",
    });
  });
});

describe("findOrphanEntityTags", () => {
  it("entity_id 指向不存在的作品/项目即为孤儿;指向存在实体则正常", () => {
    const tag = makeTag(ctx.db, "方法论");
    const w = makeWork(ctx.db, { title: "W" });
    const p = makeProject(ctx.db, { title: "P" });
    tagEntity(ctx.db, "work", w.id, tag.id); // 正常
    tagEntity(ctx.db, "project", p.id, tag.id); // 正常
    tagEntity(ctx.db, "work", 9001, tag.id); // 孤儿(无此作品)
    tagEntity(ctx.db, "project", 9002, tag.id); // 孤儿(无此项目)
    const rows = findOrphanEntityTags();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => `${r.entity_type}#${r.entity_id}`).sort()).toEqual([
      "project#9002",
      "work#9001",
    ]);
    expect(rows.every((r) => r.tagName === "方法论")).toBe(true);
  });
});

describe("getHealthReport", () => {
  it("汇总各类并累加 totalIssues", async () => {
    makeWork(ctx.db, { status: "已发表", published_at: null }); // +publishedMissingDate
    makeWork(ctx.db, { status: "投稿中" }); // +worksSubmittingNoSubmission
    const tag = makeTag(ctx.db, "T");
    tagEntity(ctx.db, "work", 12345, tag.id); // +orphan
    const report = await getHealthReport();
    expect(report.publishedMissingDate).toHaveLength(1);
    expect(report.worksSubmittingNoSubmission).toHaveLength(1);
    expect(report.orphanEntityTags).toHaveLength(1);
    expect(report.totalIssues).toBe(3);
  });

  it("干净数据 → totalIssues 0,各清单为空", async () => {
    const w = makeWork(ctx.db, {
      status: "已发表",
      published_at: "2024-01-01",
    });
    makeSubmission(ctx.db, w.id, {
      round: 1,
      status: "录用",
      decided_at: "2024-02-01",
    });
    const report = await getHealthReport();
    expect(report.totalIssues).toBe(0);
    expect(report).toMatchObject({
      publishedMissingDate: [],
      datedNotPublished: [],
      worksSubmittingNoSubmission: [],
      submissionsDecidedButPending: [],
      orphanEntityTags: [],
    });
  });
});
