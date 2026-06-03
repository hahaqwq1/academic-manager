// 成果清单 Word(.docx)生成 —— v1.0
//
// 复用导出查询数据(WorkForExport / ProjectWithOutputsExport),用纯 JS 的 docx 库
// 生成可直接投递的 .docx(年度考核 / 职称材料 / 结题报告几乎都要 Word)。零原生依赖。
import { Document, HeadingLevel, Packer, Paragraph } from "docx";

import type {
  ProjectWithOutputsExport,
  WorkForExport,
} from "@/db/queries/export";
import { WORK_TYPE_LABELS, type WorkType } from "@/lib/constants";

const NO_YEAR = "未注明年份";

function yearOf(publishedAt: string | null): string {
  if (!publishedAt) return NO_YEAR;
  const m = /^(\d{4})-/.exec(publishedAt.trim());
  return m ? `${m[1]} 年` : NO_YEAR;
}

function typeLabel(type: string): string {
  return WORK_TYPE_LABELS[type as WorkType] ?? type;
}

export function buildAchievementsDocx(
  works: WorkForExport[],
  projects: ProjectWithOutputsExport[],
): Document {
  const children: Paragraph[] = [
    new Paragraph({ text: "学术成果清单", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: "一、研究成果", heading: HeadingLevel.HEADING_2 }),
  ];

  if (works.length === 0) {
    children.push(new Paragraph({ text: "(暂无成果)" }));
  } else {
    const byYear = new Map<string, WorkForExport[]>();
    for (const w of works) {
      const y = yearOf(w.published_at);
      const list = byYear.get(y);
      if (list) list.push(w);
      else byYear.set(y, [w]);
    }
    const years = [...byYear.keys()].sort((a, b) => {
      if (a === NO_YEAR) return 1;
      if (b === NO_YEAR) return -1;
      return b.localeCompare(a);
    });
    for (const y of years) {
      children.push(
        new Paragraph({ text: y, heading: HeadingLevel.HEADING_3 }),
      );
      byYear.get(y)!.forEach((w, i) => {
        const parts = [`${i + 1}. 《${w.title}》`];
        if (w.authors) parts.push(w.authors);
        if (w.resolvedJournal) parts.push(w.resolvedJournal);
        parts.push(typeLabel(w.type));
        parts.push(w.status);
        children.push(new Paragraph({ text: parts.join("  ·  ") }));
      });
    }
  }

  children.push(
    new Paragraph({ text: "二、科研项目", heading: HeadingLevel.HEADING_2 }),
  );
  if (projects.length === 0) {
    children.push(new Paragraph({ text: "(暂无项目)" }));
  } else {
    projects.forEach((p, i) => {
      const head = [`${i + 1}. ${p.title}`, p.level, p.role, p.status];
      if (p.grant_no) head.push(`编号 ${p.grant_no}`);
      children.push(
        new Paragraph({ text: head.join("  ·  "), spacing: { before: 120 } }),
      );
      p.outputs.forEach((o) => {
        children.push(
          new Paragraph({
            text: `·《${o.title}》(${o.status})`,
            indent: { left: 360 },
          }),
        );
      });
    });
  }

  return new Document({ sections: [{ children }] });
}

export async function packDocx(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc);
}
