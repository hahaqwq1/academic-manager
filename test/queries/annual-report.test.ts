// 年度报告查询测试 —— v0.4
//
// getReportYears(发表/投稿/项目日期并集,降序去重)与
// getAnnualReport(按年聚合发表角色·类型 / 投稿结果 / 新立项 / 结题 / 经费)。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeProject, makeSubmission, makeWork } from "../helpers/factories";
import { createTestContext, type TestDb } from "../helpers/test-db";

const holder = vi.hoisted(() => ({ db: null as unknown as TestDb }));
vi.mock("@/db", () => ({
  get db() {
    return holder.db;
  },
}));

import { getAnnualReport, getReportYears } from "@/db/queries/annual-report";

let ctx: ReturnType<typeof createTestContext>;
beforeEach(() => {
  ctx = createTestContext();
  holder.db = ctx.db;
});
afterEach(() => ctx.sqlite.close());

describe("getReportYears", () => {
  it("汇集发表/投稿/项目日期的年份,降序去重", async () => {
    makeWork(ctx.db, { status: "已发表", published_at: "2023-05-01" });
    const w = makeWork(ctx.db, { status: "投稿中" });
    makeSubmission(ctx.db, w.id, { submitted_at: "2024-02-01" });
    makeProject(ctx.db, { start_date: "2022-01-01", end_date: "2025-12-31" });
    expect(await getReportYears()).toEqual([2025, 2024, 2023, 2022]);
  });

  it("空库返回 []", async () => {
    expect(await getReportYears()).toEqual([]);
  });
});

describe("getAnnualReport", () => {
  it("按年份聚合发表(角色/类型)、投稿(结果)、新立项、结题、经费", async () => {
    // 2024 发表(升序应为 A 早于 B)
    makeWork(ctx.db, {
      title: "A",
      status: "已发表",
      published_at: "2024-03-01",
      author_role: "第一作者",
      type: "paper",
      journal: "刊一",
    });
    makeWork(ctx.db, {
      title: "B",
      status: "已发表",
      published_at: "2024-09-01",
      author_role: "通讯作者",
      type: "commentary",
    });
    // 排除项:非 2024 发表、已发表但无日期
    makeWork(ctx.db, {
      title: "C",
      status: "已发表",
      published_at: "2023-01-01",
      author_role: "第一作者",
    });
    makeWork(ctx.db, { title: "D", status: "已发表" });

    // 投稿:2024 录用 + 2023 被拒(后者排除)
    const ws = makeWork(ctx.db, { title: "稿", status: "投稿中" });
    makeSubmission(ctx.db, ws.id, {
      submitted_at: "2024-04-01",
      status: "录用",
    });
    makeSubmission(ctx.db, ws.id, {
      round: 2,
      submitted_at: "2023-04-01",
      status: "被拒",
    });

    // 项目:2024 新立项(带经费)、2024 结题、2022 旧项目(排除)
    makeProject(ctx.db, {
      title: "新项目",
      level: "省部级",
      role: "主持",
      status: "已立项",
      start_date: "2024-06-01",
      funding_amount: 10,
      funding_currency: "万元",
    });
    makeProject(ctx.db, {
      title: "结题项目",
      status: "已结题",
      end_date: "2024-12-01",
    });
    makeProject(ctx.db, { title: "旧项目", start_date: "2022-01-01" });

    const r = await getAnnualReport(2024);
    expect(r.year).toBe(2024);
    expect(r.publications.map((p) => p.title)).toEqual(["A", "B"]);
    expect(r.publicationsByRole).toEqual([
      { key: "第一作者", label: "第一作者", count: 1 },
      { key: "通讯作者", label: "通讯作者", count: 1 },
    ]);
    expect(r.publicationsByType.map((t) => [t.label, t.count])).toEqual([
      ["论文", 1],
      ["评论", 1],
    ]);
    expect(r.submissions.map((s) => s.status)).toEqual(["录用"]);
    expect(r.submissionsByOutcome).toEqual([
      { key: "录用", label: "录用", count: 1 },
    ]);
    expect(r.startedProjects.map((p) => p.title)).toEqual(["新项目"]);
    expect(r.closedProjects.map((p) => p.title)).toEqual(["结题项目"]);
    expect(r.fundingByCurrency).toEqual([
      { currency: "万元", total: 10, count: 1 },
    ]);
  });

  it("某年无任何数据 → 各列表为空", async () => {
    const r = await getAnnualReport(1999);
    expect(r.publications).toEqual([]);
    expect(r.submissions).toEqual([]);
    expect(r.startedProjects).toEqual([]);
    expect(r.closedProjects).toEqual([]);
    expect(r.fundingByCurrency).toEqual([]);
  });
});
