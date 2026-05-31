// 看板聚合测试 —— P2-7
//
// 重点:getDashboardStats 的「在投」口径必须与 listPendingSubmissions 一致(P0-1 回归)。
// 另含 getPublicationsByYear / getReviewCycleByJournal / getClosingProjects(后者钉死今天)。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { createTestContext, type TestDb } from "../helpers/test-db";
import { makeWork, makeProject, makeSubmission } from "../helpers/factories";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));

import {
  getDashboardStats,
  getPublicationsByYear,
  getReviewCycleByJournal,
  getClosingProjects,
} from "@/db/queries/dashboard";
import { listPendingSubmissions } from "@/db/queries/submissions";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-05-15T12:00:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
  ctx.sqlite.close();
});

describe("getDashboardStats", () => {
  it("总数 / 已发表 / 项目数 / 在投 计数", async () => {
    makeWork(ctx.db, { status: "已发表" });
    makeWork(ctx.db, { status: "已发表" });
    makeWork(ctx.db, { status: "写作中" });
    makeProject(ctx.db, {});
    const w = makeWork(ctx.db, { status: "投稿中" });
    makeSubmission(ctx.db, w.id, { status: "在审", decided_at: null });
    const stats = await getDashboardStats();
    expect(stats).toMatchObject({
      totalWorks: 4,
      publishedWorks: 2,
      totalProjects: 1,
      pendingSubmissions: 1,
    });
  });

  it("在投口径与 listPendingSubmissions 严格一致(P0-1)", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    makeSubmission(ctx.db, w.id, { round: 1, status: "在审", decided_at: null }); // 计入
    makeSubmission(ctx.db, w.id, { round: 2, status: "在审", decided_at: "2024-05-01" }); // 已决,不计
    makeSubmission(ctx.db, w.id, { round: 3, status: "退修", decided_at: null }); // 非在审,不计
    const stats = await getDashboardStats();
    const pending = await listPendingSubmissions();
    expect(stats.pendingSubmissions).toBe(pending.length);
    expect(stats.pendingSubmissions).toBe(1);
  });
});

describe("getPublicationsByYear", () => {
  it("按发表年份聚合,升序;null/非法排除", async () => {
    makeWork(ctx.db, { published_at: "2024-03-01" });
    makeWork(ctx.db, { published_at: "2024-11-20" });
    makeWork(ctx.db, { published_at: "2025-01-05" });
    makeWork(ctx.db, { published_at: null });
    makeWork(ctx.db, { published_at: "garbage" });
    expect(await getPublicationsByYear()).toEqual([
      { year: "2024", count: 2 },
      { year: "2025", count: 1 },
    ]);
  });
});

describe("getReviewCycleByJournal", () => {
  it("各刊平均审稿周期(天),按均值倒序;未决排除;负值截 0", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    // 刊A:30 天 + 40 天 → 均值 35。
    makeSubmission(ctx.db, w.id, { round: 1, journal: "刊A", submitted_at: "2024-01-01", decided_at: "2024-01-31" });
    makeSubmission(ctx.db, w.id, { round: 2, journal: "刊A", submitted_at: "2024-01-01", decided_at: "2024-02-10" });
    // 刊B:10 天。
    makeSubmission(ctx.db, w.id, { round: 3, journal: "刊B", submitted_at: "2024-01-01", decided_at: "2024-01-11" });
    // 未决:排除。
    makeSubmission(ctx.db, w.id, { round: 4, journal: "刊C", submitted_at: "2024-01-01", decided_at: null });
    expect(await getReviewCycleByJournal()).toEqual([
      { journal: "刊A", avgDays: 35, count: 2 },
      { journal: "刊B", avgDays: 10, count: 1 },
    ]);
  });
});

describe("getClosingProjects", () => {
  it("结题中优先,其次临近截止升序;已结题/未中排除;远期排除", async () => {
    // 今天 2024-05-15。
    const p1 = makeProject(ctx.db, { title: "结题中A", status: "结题中", end_date: null });
    const p2 = makeProject(ctx.db, { title: "临近17天", status: "已立项", end_date: "2024-06-01" });
    const p3 = makeProject(ctx.db, { title: "已逾期", status: "已立项", end_date: "2024-04-01" });
    makeProject(ctx.db, { title: "远期", status: "已立项", end_date: "2025-12-31" }); // 排除
    makeProject(ctx.db, { title: "已结题", status: "已结题", end_date: "2024-05-20" }); // 排除
    makeProject(ctx.db, { title: "未中", status: "未中", end_date: "2024-05-20" }); // 排除
    const list = await getClosingProjects();
    expect(list.map((p) => p.title)).toEqual(["结题中A", "已逾期", "临近17天"]);
    expect(list.map((p) => p.id)).toEqual([p1.id, p3.id, p2.id]);
    expect(list[0].reason).toBe("结题中");
    expect(list[1].reason).toBe("临近结题");
  });
});
