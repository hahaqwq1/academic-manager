// 年度报告 Markdown 生成 —— v0.4
//
// 把 getAnnualReport() 的结构化数据渲染成可直接复制进 Word / 述职材料的 Markdown。
// 纯函数(不碰 DB / 网络),供 /reports 客户端复制与单测使用。
import type { AnnualReport, ReportProject } from "@/db/queries/annual-report";

function projectLine(p: ReportProject): string {
  const parts = [p.title, p.level, p.role];
  if (p.grant_no) parts.push(`编号 ${p.grant_no}`);
  if (p.funding_amount != null) {
    parts.push(`经费 ${p.funding_amount} ${p.funding_currency ?? "元"}`);
  } else if (p.funding && p.funding.trim() !== "") {
    parts.push(`经费 ${p.funding.trim()}`);
  }
  return parts.join(" · ");
}

export function buildReportMarkdown(r: AnnualReport): string {
  const lines: string[] = [];
  lines.push(`# ${r.year} 年度学术成果报告`);
  lines.push("");

  // 一、发表
  lines.push(`## 一、发表成果(共 ${r.publications.length} 篇)`);
  lines.push("");
  if (r.publications.length > 0) {
    const roleSummary = r.publicationsByRole
      .map((x) => `${x.label} ${x.count} 篇`)
      .join("、");
    if (roleSummary) lines.push(`- 作者角色:${roleSummary}`);
    const typeSummary = r.publicationsByType
      .map((x) => `${x.label} ${x.count} 篇`)
      .join("、");
    if (typeSummary) lines.push(`- 类型分布:${typeSummary}`);
    lines.push("");
    r.publications.forEach((p, i) => {
      const parts = [p.title];
      if (p.journal) parts.push(p.journal);
      if (p.role) parts.push(p.role);
      if (p.published_at) parts.push(p.published_at);
      lines.push(`${i + 1}. ${parts.join(" · ")}`);
    });
  } else {
    lines.push("本年无已发表成果。");
  }
  lines.push("");

  // 二、投稿
  lines.push(`## 二、投稿记录(共 ${r.submissions.length} 次)`);
  lines.push("");
  if (r.submissions.length > 0) {
    const outcome = r.submissionsByOutcome
      .map((x) => `${x.label} ${x.count}`)
      .join("、");
    if (outcome) lines.push(`- 结果分布:${outcome}`);
    lines.push("");
    r.submissions.forEach((s, i) => {
      lines.push(
        `${i + 1}. ${s.work_title} · ${s.journal} · ${s.status} · ${s.submitted_at}`,
      );
    });
  } else {
    lines.push("本年无投稿记录。");
  }
  lines.push("");

  // 三、新立项项目
  lines.push(`## 三、本年新立项项目(共 ${r.startedProjects.length} 项)`);
  lines.push("");
  if (r.startedProjects.length > 0) {
    r.startedProjects.forEach((p, i) =>
      lines.push(`${i + 1}. ${projectLine(p)}`),
    );
  } else {
    lines.push("本年无新立项项目。");
  }
  lines.push("");

  // 四、结题项目
  lines.push(`## 四、本年结题项目(共 ${r.closedProjects.length} 项)`);
  lines.push("");
  if (r.closedProjects.length > 0) {
    r.closedProjects.forEach((p, i) =>
      lines.push(`${i + 1}. ${projectLine(p)}`),
    );
  } else {
    lines.push("本年无结题项目。");
  }
  lines.push("");

  // 五、经费(本年新立项中的结构化金额)
  if (r.fundingByCurrency.length > 0) {
    lines.push("## 五、本年新立项经费(按币种汇总)");
    lines.push("");
    r.fundingByCurrency.forEach((f) =>
      lines.push(`- ${f.currency}:${f.total}(${f.count} 项)`),
    );
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
