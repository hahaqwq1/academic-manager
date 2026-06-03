// 科研分析查询测试 —— 升级线(科研分析深化)
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
  getSubmissionOutcomes,
  getAcceptanceRate,
  getSubmissionTrendByYear,
  getPublicationsByAuthorRole,
  getPublicationsByType,
  getCumulativePublicationsByYear,
  getFundingSummary,
} from "@/db/queries/analytics";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
});
afterEach(() => ctx.sqlite.close());

describe("getSubmissionOutcomes", () => {
  it("只含计数>0的状态,按枚举序", async () => {
    const w = makeWork(ctx.db, {});
    makeSubmission(ctx.db, w.id, {
      round: 1,
      status: "录用",
      decided_at: "2024-02-01",
    });
    makeSubmission(ctx.db, w.id, {
      round: 2,
      status: "录用",
      decided_at: "2024-03-01",
    });
    makeSubmission(ctx.db, w.id, {
      round: 3,
      status: "被拒",
      decided_at: "2024-04-01",
    });
    expect(await getSubmissionOutcomes()).toEqual([
      { status: "录用", count: 2 },
      { status: "被拒", count: 1 },
    ]);
  });
});

describe("getAcceptanceRate", () => {
  it("录用/(录用+被拒);在审/撤稿不计分母", async () => {
    const w = makeWork(ctx.db, {});
    makeSubmission(ctx.db, w.id, {
      round: 1,
      status: "录用",
      decided_at: "2024-02-01",
    });
    makeSubmission(ctx.db, w.id, {
      round: 2,
      status: "被拒",
      decided_at: "2024-02-01",
    });
    makeSubmission(ctx.db, w.id, {
      round: 3,
      status: "被拒",
      decided_at: "2024-02-01",
    });
    makeSubmission(ctx.db, w.id, {
      round: 4,
      status: "在审",
      decided_at: null,
    });
    makeSubmission(ctx.db, w.id, {
      round: 5,
      status: "已撤稿",
      decided_at: null,
    });
    const r = await getAcceptanceRate();
    expect(r).toMatchObject({ decided: 3, accepted: 1, rejected: 2 });
    expect(r.rate).toBeCloseTo(1 / 3);
  });
  it("无已决 → rate 0", async () => {
    const w = makeWork(ctx.db, {});
    makeSubmission(ctx.db, w.id, {
      round: 1,
      status: "在审",
      decided_at: null,
    });
    expect((await getAcceptanceRate()).rate).toBe(0);
  });
});

describe("getSubmissionTrendByYear", () => {
  it("按投稿年份计数 + 平均周期(无决定不计周期)", async () => {
    const w = makeWork(ctx.db, {});
    makeSubmission(ctx.db, w.id, {
      round: 1,
      submitted_at: "2023-01-01",
      decided_at: "2023-01-31",
    });
    makeSubmission(ctx.db, w.id, {
      round: 2,
      submitted_at: "2023-06-01",
      decided_at: null,
    });
    makeSubmission(ctx.db, w.id, {
      round: 3,
      submitted_at: "2024-01-01",
      decided_at: "2024-01-11",
    });
    expect(await getSubmissionTrendByYear()).toEqual([
      { year: "2023", count: 2, avgCycleDays: 30 },
      { year: "2024", count: 1, avgCycleDays: 10 },
    ]);
  });
});

describe("getPublicationsByAuthorRole / ByType", () => {
  it("已发表按作者角色,未标注单列,非已发表排除", async () => {
    makeWork(ctx.db, { status: "已发表", author_role: "第一作者" });
    makeWork(ctx.db, { status: "已发表", author_role: "第一作者" });
    makeWork(ctx.db, { status: "已发表", author_role: "通讯作者" });
    makeWork(ctx.db, { status: "已发表", author_role: null });
    makeWork(ctx.db, { status: "写作中", author_role: "第一作者" });
    expect(await getPublicationsByAuthorRole()).toEqual([
      { role: "第一作者", count: 2 },
      { role: "通讯作者", count: 1 },
      { role: "未标注", count: 1 },
    ]);
  });
  it("已发表按类型", async () => {
    makeWork(ctx.db, { status: "已发表", type: "paper" });
    makeWork(ctx.db, { status: "已发表", type: "paper" });
    makeWork(ctx.db, { status: "已发表", type: "commentary" });
    makeWork(ctx.db, { status: "投稿中", type: "paper" });
    expect(await getPublicationsByType()).toEqual([
      { type: "paper", count: 2 },
      { type: "commentary", count: 1 },
    ]);
  });
});

describe("getCumulativePublicationsByYear", () => {
  it("已发表且有日期,逐年累加", async () => {
    makeWork(ctx.db, { status: "已发表", published_at: "2022-05-01" });
    makeWork(ctx.db, { status: "已发表", published_at: "2023-01-01" });
    makeWork(ctx.db, { status: "已发表", published_at: "2023-09-01" });
    makeWork(ctx.db, { status: "已发表", published_at: null });
    makeWork(ctx.db, { status: "投稿中", published_at: "2024-01-01" });
    expect(await getCumulativePublicationsByYear()).toEqual([
      { year: "2022", cumulative: 1 },
      { year: "2023", cumulative: 3 },
    ]);
  });
});

describe("getFundingSummary", () => {
  it("按级别×币种汇总结构化经费,文本经费单列", async () => {
    makeProject(ctx.db, {
      level: "国家级",
      funding_amount: 80,
      funding_currency: "万元",
    });
    makeProject(ctx.db, {
      level: "国家级",
      funding_amount: 20,
      funding_currency: "万元",
    });
    makeProject(ctx.db, {
      level: "省部级",
      funding_amount: 10,
      funding_currency: "万元",
    });
    makeProject(ctx.db, {
      level: "校级",
      funding_amount: 5000,
      funding_currency: "元",
    });
    makeProject(ctx.db, {
      level: "校级",
      funding: "若干",
      funding_amount: null,
    });
    makeProject(ctx.db, { level: "校级" });
    const s = await getFundingSummary();
    expect(s.textOnlyCount).toBe(1);
    expect(s.byLevel).toEqual([
      { level: "国家级", currency: "万元", total: 100, count: 2 },
      { level: "省部级", currency: "万元", total: 10, count: 1 },
      { level: "校级", currency: "元", total: 5000, count: 1 },
    ]);
  });
});
