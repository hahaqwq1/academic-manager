// 年度报告 Markdown 生成测试 —— v0.4
import { describe, expect, it } from "vitest";

import type { AnnualReport } from "@/db/queries/annual-report";
import { buildReportMarkdown } from "@/lib/report-markdown";

const empty: AnnualReport = {
  year: 2024,
  publications: [],
  publicationsByRole: [],
  publicationsByType: [],
  submissions: [],
  submissionsByOutcome: [],
  startedProjects: [],
  closedProjects: [],
  fundingByCurrency: [],
};

describe("buildReportMarkdown", () => {
  it("空报告:各小节显示「无」文案,且不含经费小节", () => {
    const md = buildReportMarkdown(empty);
    expect(md).toContain("# 2024 年度学术成果报告");
    expect(md).toContain("本年无已发表成果。");
    expect(md).toContain("本年无投稿记录。");
    expect(md).toContain("本年无新立项项目。");
    expect(md).toContain("本年无结题项目。");
    expect(md).not.toContain("## 五、");
  });

  it("有数据:标题计数、列表行、经费小节齐全", () => {
    const r: AnnualReport = {
      ...empty,
      publications: [
        {
          id: 1,
          title: "论文A",
          journal: "刊一",
          role: "第一作者",
          type: "paper",
          published_at: "2024-03-01",
        },
      ],
      publicationsByRole: [{ key: "第一作者", label: "第一作者", count: 1 }],
      publicationsByType: [{ key: "paper", label: "论文", count: 1 }],
      submissions: [
        {
          id: 1,
          work_id: 1,
          work_title: "稿",
          journal: "刊二",
          status: "录用",
          submitted_at: "2024-04-01",
        },
      ],
      submissionsByOutcome: [{ key: "录用", label: "录用", count: 1 }],
      startedProjects: [
        {
          id: 1,
          title: "新项目",
          level: "省部级",
          role: "主持",
          status: "已立项",
          grant_no: "G1",
          funding_amount: 10,
          funding_currency: "万元",
          funding: null,
          start_date: "2024-06-01",
          end_date: null,
        },
      ],
      fundingByCurrency: [{ currency: "万元", total: 10, count: 1 }],
    };
    const md = buildReportMarkdown(r);
    expect(md).toContain("## 一、发表成果(共 1 篇)");
    expect(md).toContain("1. 论文A · 刊一 · 第一作者 · 2024-03-01");
    expect(md).toContain("- 作者角色:第一作者 1 篇");
    expect(md).toContain("## 二、投稿记录(共 1 次)");
    expect(md).toContain("1. 稿 · 刊二 · 录用 · 2024-04-01");
    expect(md).toContain("## 三、本年新立项项目(共 1 项)");
    expect(md).toContain("新项目 · 省部级 · 主持 · 编号 G1 · 经费 10 万元");
    expect(md).toContain("## 五、本年新立项经费(按币种汇总)");
    expect(md).toContain("- 万元:10(1 项)");
  });
});
