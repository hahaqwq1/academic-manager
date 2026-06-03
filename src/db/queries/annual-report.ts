// 年度报告查询 —— v0.4
//
// 按某一年份聚合「发表 / 投稿 / 新立项 / 结题 / 经费」,供 /reports 生成述职、
// 年终总结、基金进展报告等可直接抄录的材料。沿用 analytics/dashboard 的
// 「整表取出 + JS 按年份(parseDateOnly)聚合」风格(单人本地库数据量小)。
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { projects, submissions, works } from "@/db/schema";
import {
  AUTHOR_ROLES,
  type AuthorRole,
  type ProjectLevel,
  type ProjectRole,
  type ProjectStatus,
  SUBMISSION_STATUSES,
  type SubmissionStatus,
  WORK_TYPE_LABELS,
  WORK_TYPES,
  type WorkType,
} from "@/lib/constants";
import { parseDateOnly } from "@/lib/format";

function yearOf(date: string | null): number | null {
  const d = parseDateOnly(date);
  return d ? d.getFullYear() : null;
}

export interface ReportPublication {
  id: number;
  title: string;
  journal: string | null;
  role: AuthorRole | null;
  type: WorkType;
  published_at: string | null;
}

export interface ReportSubmission {
  id: number;
  work_id: number;
  work_title: string;
  journal: string;
  status: SubmissionStatus;
  submitted_at: string;
}

export interface ReportProject {
  id: number;
  title: string;
  level: ProjectLevel;
  role: ProjectRole;
  status: ProjectStatus;
  grant_no: string | null;
  funding_amount: number | null;
  funding_currency: string | null;
  funding: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface CountBy<K> {
  key: K;
  label: string;
  count: number;
}

export interface FundingByCurrency {
  currency: string;
  total: number;
  count: number;
}

export interface AnnualReport {
  year: number;
  publications: ReportPublication[];
  publicationsByRole: CountBy<AuthorRole | "未标注">[];
  publicationsByType: CountBy<WorkType>[];
  submissions: ReportSubmission[];
  submissionsByOutcome: CountBy<SubmissionStatus>[];
  startedProjects: ReportProject[];
  closedProjects: ReportProject[];
  fundingByCurrency: FundingByCurrency[];
}

// 可选年份:已发表日期 / 投稿日期 / 项目开始或结束日期 的并集,降序(最近年份在前)。
export async function getReportYears(): Promise<number[]> {
  const ys = new Set<number>();
  for (const r of db.select({ d: works.published_at }).from(works).all()) {
    const y = yearOf(r.d);
    if (y) ys.add(y);
  }
  for (const r of db
    .select({ d: submissions.submitted_at })
    .from(submissions)
    .all()) {
    const y = yearOf(r.d);
    if (y) ys.add(y);
  }
  for (const r of db
    .select({ s: projects.start_date, e: projects.end_date })
    .from(projects)
    .all()) {
    const ys1 = yearOf(r.s);
    if (ys1) ys.add(ys1);
    const ye = yearOf(r.e);
    if (ye) ys.add(ye);
  }
  return [...ys].sort((a, b) => b - a);
}

export async function getAnnualReport(year: number): Promise<AnnualReport> {
  // 发表:status=已发表 且 published_at 落在 year。
  const pubRows = db
    .select({
      id: works.id,
      title: works.title,
      journal: works.journal,
      role: works.author_role,
      type: works.type,
      published_at: works.published_at,
    })
    .from(works)
    .where(eq(works.status, "已发表"))
    .all();
  const publications = pubRows
    .filter((r) => yearOf(r.published_at) === year)
    .sort((a, b) => (a.published_at ?? "").localeCompare(b.published_at ?? ""));

  const roleMap = new Map<string, number>();
  for (const p of publications) {
    const k = p.role ?? "未标注";
    roleMap.set(k, (roleMap.get(k) ?? 0) + 1);
  }
  const publicationsByRole: CountBy<AuthorRole | "未标注">[] = [];
  for (const role of AUTHOR_ROLES) {
    const c = roleMap.get(role) ?? 0;
    if (c > 0) publicationsByRole.push({ key: role, label: role, count: c });
  }
  const unlabeled = roleMap.get("未标注") ?? 0;
  if (unlabeled > 0)
    publicationsByRole.push({
      key: "未标注",
      label: "未标注",
      count: unlabeled,
    });

  const typeMap = new Map<WorkType, number>();
  for (const p of publications)
    typeMap.set(p.type, (typeMap.get(p.type) ?? 0) + 1);
  const publicationsByType: CountBy<WorkType>[] = WORK_TYPES.map((type) => ({
    key: type,
    label: WORK_TYPE_LABELS[type],
    count: typeMap.get(type) ?? 0,
  })).filter((r) => r.count > 0);

  // 投稿:submitted_at 落在 year(联表带作品标题)。
  const subRows = db
    .select({
      id: submissions.id,
      work_id: submissions.work_id,
      work_title: works.title,
      journal: submissions.journal,
      status: submissions.status,
      submitted_at: submissions.submitted_at,
    })
    .from(submissions)
    .innerJoin(works, eq(submissions.work_id, works.id))
    .all();
  const reportSubmissions = subRows
    .filter((r) => yearOf(r.submitted_at) === year)
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
  const outcomeMap = new Map<SubmissionStatus, number>();
  for (const s of reportSubmissions)
    outcomeMap.set(s.status, (outcomeMap.get(s.status) ?? 0) + 1);
  const submissionsByOutcome: CountBy<SubmissionStatus>[] =
    SUBMISSION_STATUSES.map((status) => ({
      key: status,
      label: status,
      count: outcomeMap.get(status) ?? 0,
    })).filter((r) => r.count > 0);

  // 项目:本年新立项(start_date 落在 year)/ 本年结题(status=已结题 且 end_date 落在 year)。
  const projRows = db.select().from(projects).all();
  const startedProjects = projRows
    .filter((p) => yearOf(p.start_date) === year)
    .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""));
  const closedProjects = projRows
    .filter((p) => p.status === "已结题" && yearOf(p.end_date) === year)
    .sort((a, b) => (a.end_date ?? "").localeCompare(b.end_date ?? ""));

  // 经费:本年新立项项目里有结构化金额的,按币种汇总(不做汇率换算)。
  const fundMap = new Map<string, FundingByCurrency>();
  for (const p of startedProjects) {
    if (p.funding_amount == null) continue;
    const currency = p.funding_currency ?? "元";
    const e = fundMap.get(currency) ?? { currency, total: 0, count: 0 };
    e.total += p.funding_amount;
    e.count += 1;
    fundMap.set(currency, e);
  }
  const fundingByCurrency = [...fundMap.values()].sort((a, b) =>
    a.currency.localeCompare(b.currency),
  );

  return {
    year,
    publications,
    publicationsByRole,
    publicationsByType,
    submissions: reportSubmissions,
    submissionsByOutcome,
    startedProjects,
    closedProjects,
    fundingByCurrency,
  };
}
