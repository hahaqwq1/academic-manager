// 引用格式化单测 —— 升级线(元数据 + 引用)
import { describe, it, expect } from "vitest";

import { toAPA, toGB7714, toBibTeX, type CitationWork } from "@/lib/citation";

const base: CitationWork = {
  title: "论文标题",
  authors: "张三; 李四",
  journal: "民族研究",
  published_at: "2024-03-01",
  doi: "10.1000/abc",
  type: "paper",
};

describe("toAPA", () => {
  it("双作者 + journal + doi", () => {
    expect(toAPA(base)).toBe(
      "张三 & 李四 (2024). 论文标题. 民族研究. https://doi.org/10.1000/abc",
    );
  });
  it("单作者、仅年份、缺 journal/doi", () => {
    expect(
      toAPA({
        ...base,
        authors: "张三",
        journal: null,
        doi: null,
        published_at: "2024",
      }),
    ).toBe("张三 (2024). 论文标题.");
  });
  it("三作者用 ', & ' 连接末位", () => {
    expect(
      toAPA({ ...base, authors: "甲; 乙; 丙", journal: null, doi: null }),
    ).toBe("甲, 乙, & 丙 (2024). 论文标题.");
  });
});

describe("toGB7714", () => {
  it("期刊文章 [J]", () => {
    expect(toGB7714(base)).toBe(
      "张三, 李四. 论文标题[J]. 民族研究, 2024. DOI:10.1000/abc.",
    );
  });
  it("非论文用 [Z],缺 journal/doi", () => {
    expect(toGB7714({ ...base, type: "other", journal: null, doi: null })).toBe(
      "张三, 李四. 论文标题[Z], 2024.",
    );
  });
});

describe("toBibTeX", () => {
  it("@article + 键 + 字段", () => {
    const s = toBibTeX(base);
    expect(s).toContain("@article{张三2024,");
    expect(s).toContain("title = {论文标题}");
    expect(s).toContain("author = {张三 and 李四}");
    expect(s).toContain("journal = {民族研究}");
    expect(s).toContain("year = {2024}");
    expect(s).toContain("doi = {10.1000/abc}");
  });
  it("非论文 → @misc,无作者则省略 author 行", () => {
    const s = toBibTeX({ ...base, type: "draft", authors: null });
    expect(s.startsWith("@misc{anon2024,")).toBe(true);
    expect(s).not.toContain("author =");
  });
});
