// 成果清单 docx 生成测试 —— v1.0
//
// 不解析 OOXML,只验证产物是合法的 .docx:zip 容器(PK 签名)且非空,空数据也不崩。
import { describe, expect, it } from "vitest";

import type {
  ProjectWithOutputsExport,
  WorkForExport,
} from "@/db/queries/export";
import { buildAchievementsDocx, packDocx } from "@/lib/docx-report";

const work = {
  id: 1,
  type: "paper",
  title: "论文A",
  status: "已发表",
  authors: "张三",
  author_role: "第一作者",
  word_count: null,
  summary: null,
  notes: null,
  file_path: null,
  doi: null,
  journal: "刊一",
  published_at: "2024-03-01",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  resolvedJournal: "刊一",
} as unknown as WorkForExport;

const project: ProjectWithOutputsExport = {
  id: 1,
  title: "项目甲",
  level: "省部级",
  role: "主持",
  status: "已结题",
  grant_no: "G1",
  outputs: [
    {
      title: "论文A",
      type: "paper",
      status: "已发表",
      authors: "张三",
      published_at: "2024-03-01",
    },
  ],
};

describe("buildAchievementsDocx", () => {
  it("生成可打开的 .docx(zip PK 签名,非空)", async () => {
    const buf = await packDocx(buildAchievementsDocx([work], [project]));
    expect(buf.length).toBeGreaterThan(0);
    expect(buf[0]).toBe(0x50); // 'P'
    expect(buf[1]).toBe(0x4b); // 'K'
  });

  it("空数据也能生成合法 docx", async () => {
    const buf = await packDocx(buildAchievementsDocx([], []));
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
});
