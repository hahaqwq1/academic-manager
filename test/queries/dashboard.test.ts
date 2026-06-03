// 看板聚合测试 —— P2-7
//
// 重点:getDashboardStats 的「在投」口径必须与 listPendingSubmissions 一致(P0-1 回归)。
// 另含 getPublicationsByYear / getReviewCycleByJournal / getClosingProjects(后者钉死今天)。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeProject, makeSubmission, makeWork } from "../helpers/factories";
import { createTestContext, type TestDb } from "../helpers/test-db";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));

import {
  getClosingProjects,
  getDashboardStats,
  getPublicationDataHealth,
  getPublicationsByYear,
  getReviewCycleByJournal,
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
    makeSubmission(ctx.db, w.id, {
      round: 1,
      status: "在审",
      decided_at: null,
    }); // 计入
    makeSubmission(ctx.db, w.id, {
      round: 2,
      status: "在审",
      decided_at: "2024-05-01",
    }); // 已决,不计
    makeSubmission(ctx.db, w.id, {
      round: 3,
      status: "退修",
      decided_at: null,
    }); // 非在审,不计
    const stats = await getDashboardStats();
    const pending = await listPendingSubmissions();
    expect(stats.pendingSubmissions).toBe(pending.length);
    expect(stats.pendingSubmissions).toBe(1);
  });
});

describe("getPublicationsByYear(口径=已发表 AND published_at 非空)", () => {
  it("仅统计『已发表』且有合法发表日期的作品,按年份升序", async () => {
    makeWork(ctx.db, { status: "已发表", published_at: "2024-03-01" });
    makeWork(ctx.db, { status: "已发表", published_at: "2024-11-20" });
    makeWork(ctx.db, { status: "已发表", published_at: "2025-01-05" });
    // 已发表但未填日期:排除(进数据健康提示,不进年度图)。
    makeWork(ctx.db, { status: "已发表", published_at: null });
    // 填了日期但状态非已发表:排除(口径外,与「已发表」数字一致)。
    makeWork(ctx.db, { status: "投稿中", published_at: "2025-07-07" });
    // 非法日期串:进 SQL 但被 parseDateOnly 拒,排除。
    makeWork(ctx.db, { status: "已发表", published_at: "garbage" });
    expect(await getPublicationsByYear()).toEqual([
      { year: "2024", count: 2 },
      { year: "2025", count: 1 },
    ]);
  });
});

describe("getPublicationDataHealth(口径外数据计数)", () => {
  it("分别统计『已发表缺日期』与『有日期非已发表』", async () => {
    makeWork(ctx.db, { status: "已发表", published_at: "2024-01-01" }); // 健康,两者都不计
    makeWork(ctx.db, { status: "已发表", published_at: null }); // +publishedMissingDate
    makeWork(ctx.db, { status: "已发表", published_at: null }); // +publishedMissingDate
    makeWork(ctx.db, { status: "投稿中", published_at: "2025-01-01" }); // +datedNotPublished
    makeWork(ctx.db, { status: "已搁置", published_at: "2025-02-01" }); // +datedNotPublished
    makeWork(ctx.db, { status: "写作中", published_at: null }); // 两者都不计
    expect(await getPublicationDataHealth()).toEqual({
      publishedMissingDate: 2,
      datedNotPublished: 2,
    });
  });

  it("干净数据 → 全 0", async () => {
    makeWork(ctx.db, { status: "已发表", published_at: "2024-01-01" });
    makeWork(ctx.db, { status: "写作中", published_at: null });
    expect(await getPublicationDataHealth()).toEqual({
      publishedMissingDate: 0,
      datedNotPublished: 0,
    });
  });
});

describe("getReviewCycleByJournal", () => {
  it("各刊平均审稿周期(天),按均值倒序;未决排除;负值截 0", async () => {
    const w = makeWork(ctx.db, { title: "W" });
    // 刊A:30 天 + 40 天 → 均值 35。
    makeSubmission(ctx.db, w.id, {
      round: 1,
      journal: "刊A",
      submitted_at: "2024-01-01",
      decided_at: "2024-01-31",
    });
    makeSubmission(ctx.db, w.id, {
      round: 2,
      journal: "刊A",
      submitted_at: "2024-01-01",
      decided_at: "2024-02-10",
    });
    // 刊B:10 天。
    makeSubmission(ctx.db, w.id, {
      round: 3,
      journal: "刊B",
      submitted_at: "2024-01-01",
      decided_at: "2024-01-11",
    });
    // 未决:排除。
    makeSubmission(ctx.db, w.id, {
      round: 4,
      journal: "刊C",
      submitted_at: "2024-01-01",
      decided_at: null,
    });
    expect(await getReviewCycleByJournal()).toEqual([
      { journal: "刊A", avgDays: 35, count: 2 },
      { journal: "刊B", avgDays: 10, count: 1 },
    ]);
  });
});

describe("getClosingProjects", () => {
  it("结题中优先,其次临近截止升序;已结题/未中排除;远期排除", async () => {
    // 今天 2024-05-15。
    const p1 = makeProject(ctx.db, {
      title: "结题中A",
      status: "结题中",
      end_date: null,
    });
    const p2 = makeProject(ctx.db, {
      title: "临近17天",
      status: "已立项",
      end_date: "2024-06-01",
    });
    const p3 = makeProject(ctx.db, {
      title: "已逾期",
      status: "已立项",
      end_date: "2024-04-01",
    });
    makeProject(ctx.db, {
      title: "远期",
      status: "已立项",
      end_date: "2025-12-31",
    }); // 排除
    makeProject(ctx.db, {
      title: "已结题",
      status: "已结题",
      end_date: "2024-05-20",
    }); // 排除
    makeProject(ctx.db, {
      title: "未中",
      status: "未中",
      end_date: "2024-05-20",
    }); // 排除
    const list = await getClosingProjects();
    expect(list.map((p) => p.title)).toEqual(["结题中A", "已逾期", "临近17天"]);
    expect(list.map((p) => p.id)).toEqual([p1.id, p3.id, p2.id]);
    expect(list[0]!.reason).toBe("结题中");
    expect(list[1]!.reason).toBe("临近结题");
  });
});
