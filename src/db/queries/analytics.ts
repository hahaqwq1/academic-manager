// 科研分析查询 —— 升级线(科研分析深化)
//
// 仪表盘新增的聚合:投稿录用率/结果分布、审稿周期与投稿量逐年趋势、发表的作者角色/类型分布、
// 累计发表曲线、按级别×币种的经费汇总(只计结构化 funding_amount,文本经费单列提示)。
// 沿用 dashboard.ts 的「SQL 取数 + JS 聚合」风格;日期解析复用 format.parseDateOnly。
import { eq, and, isNotNull, count } from "drizzle-orm";

import { db } from "@/db";
import { works, submissions, projects } from "@/db/schema";
import { DAY_MS, parseDateOnly } from "@/lib/format";
import {
  SUBMISSION_STATUSES,
  WORK_TYPES,
  AUTHOR_ROLES,
  PROJECT_LEVELS,
  type SubmissionStatus,
  type WorkType,
  type AuthorRole,
  type ProjectLevel,
} from "@/lib/constants";

// 投稿结果分布(仅计数 > 0 的状态,供环形饼)。
export interface OutcomeCount {
  status: SubmissionStatus;
  count: number;
}
export async function getSubmissionOutcomes(): Promise<OutcomeCount[]> {
  const rows = db
    .select({ status: submissions.status, value: count() })
    .from(submissions)
    .groupBy(submissions.status)
    .all();
  const map = new Map(rows.map((r) => [r.status, r.value]));
  return SUBMISSION_STATUSES.map((status) => ({
    status,
    count: map.get(status) ?? 0,
  })).filter((r) => r.count > 0);
}

// 录用率:已决 = 录用 + 被拒;rate = 录用 / 已决(已决为 0 → 0)。已撤稿 / 在审 / 退修 不计入分母。
export interface AcceptanceRate {
  decided: number;
  accepted: number;
  rejected: number;
  rate: number;
}
export async function getAcceptanceRate(): Promise<AcceptanceRate> {
  const rows = db
    .select({ status: submissions.status, value: count() })
    .from(submissions)
    .groupBy(submissions.status)
    .all();
  const m = new Map(rows.map((r) => [r.status, r.value]));
  const accepted = m.get("录用") ?? 0;
  const rejected = m.get("被拒") ?? 0;
  const decided = accepted + rejected;
  return {
    decided,
    accepted,
    rejected,
    rate: decided === 0 ? 0 : accepted / decided,
  };
}

// 投稿量 + 平均审稿周期 逐年趋势(按 submitted_at 年份;周期由已决投稿 decided-submitted 计)。
export interface SubmissionYearTrend {
  year: string;
  count: number;
  avgCycleDays: number | null;
}
export async function getSubmissionTrendByYear(): Promise<
  SubmissionYearTrend[]
> {
  const rows = db
    .select({
      submitted_at: submissions.submitted_at,
      decided_at: submissions.decided_at,
    })
    .from(submissions)
    .all();
  const byYear = new Map<
    string,
    { count: number; cycleSum: number; cycleN: number }
  >();
  for (const r of rows) {
    const sd = parseDateOnly(r.submitted_at);
    if (!sd) continue;
    const y = String(sd.getFullYear());
    const cur = byYear.get(y) ?? { count: 0, cycleSum: 0, cycleN: 0 };
    cur.count += 1;
    const dd = parseDateOnly(r.decided_at);
    if (dd) {
      cur.cycleSum += Math.max(
        0,
        Math.round((dd.getTime() - sd.getTime()) / DAY_MS),
      );
      cur.cycleN += 1;
    }
    byYear.set(y, cur);
  }
  return [...byYear.entries()]
    .map(([year, v]) => ({
      year,
      count: v.count,
      avgCycleDays: v.cycleN > 0 ? Math.round(v.cycleSum / v.cycleN) : null,
    }))
    .sort((a, b) => a.year.localeCompare(b.year));
}

// 已发表作品按作者角色分布(未标注单列)。
export interface RoleCount {
  role: AuthorRole | "未标注";
  count: number;
}
export async function getPublicationsByAuthorRole(): Promise<RoleCount[]> {
  const rows = db
    .select({ role: works.author_role, value: count() })
    .from(works)
    .where(eq(works.status, "已发表"))
    .groupBy(works.author_role)
    .all();
  const m = new Map<string, number>();
  for (const r of rows) {
    const key = r.role ?? "未标注";
    m.set(key, (m.get(key) ?? 0) + r.value);
  }
  const result: RoleCount[] = [];
  for (const role of AUTHOR_ROLES) {
    const c = m.get(role) ?? 0;
    if (c > 0) result.push({ role, count: c });
  }
  const unlabeled = m.get("未标注") ?? 0;
  if (unlabeled > 0) result.push({ role: "未标注", count: unlabeled });
  return result;
}

// 已发表作品按类型分布。
export interface TypeCount {
  type: WorkType;
  count: number;
}
export async function getPublicationsByType(): Promise<TypeCount[]> {
  const rows = db
    .select({ type: works.type, value: count() })
    .from(works)
    .where(eq(works.status, "已发表"))
    .groupBy(works.type)
    .all();
  const m = new Map(rows.map((r) => [r.type, r.value]));
  return WORK_TYPES.map((type) => ({ type, count: m.get(type) ?? 0 })).filter(
    (r) => r.count > 0,
  );
}

// 累计发表曲线(已发表且有发表日期,按年累加)。
export interface CumulativeYear {
  year: string;
  cumulative: number;
}
export async function getCumulativePublicationsByYear(): Promise<
  CumulativeYear[]
> {
  const rows = db
    .select({ published_at: works.published_at })
    .from(works)
    .where(and(eq(works.status, "已发表"), isNotNull(works.published_at)))
    .all();
  const byYear = new Map<string, number>();
  for (const r of rows) {
    const d = parseDateOnly(r.published_at);
    if (!d) continue;
    const y = String(d.getFullYear());
    byYear.set(y, (byYear.get(y) ?? 0) + 1);
  }
  const years = [...byYear.keys()].sort((a, b) => a.localeCompare(b));
  let acc = 0;
  return years.map((year) => {
    acc += byYear.get(year) ?? 0;
    return { year, cumulative: acc };
  });
}

// 经费汇总:按 级别×币种 汇总结构化 funding_amount;仅有文本经费(funding 非空但金额空)的项目单独计数。
export interface FundingByLevel {
  level: ProjectLevel;
  currency: string;
  total: number;
  count: number;
}
export interface FundingSummary {
  byLevel: FundingByLevel[];
  textOnlyCount: number;
}
export async function getFundingSummary(): Promise<FundingSummary> {
  const rows = db
    .select({
      level: projects.level,
      currency: projects.funding_currency,
      amount: projects.funding_amount,
      funding: projects.funding,
    })
    .from(projects)
    .all();
  const map = new Map<string, FundingByLevel>();
  let textOnlyCount = 0;
  for (const r of rows) {
    if (r.amount != null) {
      const currency = r.currency ?? "元";
      const key = `${r.level}|${currency}`;
      const e = map.get(key) ?? {
        level: r.level,
        currency,
        total: 0,
        count: 0,
      };
      e.total += r.amount;
      e.count += 1;
      map.set(key, e);
    } else if (r.funding && r.funding.trim() !== "") {
      textOnlyCount += 1;
    }
  }
  const byLevel = [...map.values()].sort(
    (a, b) =>
      PROJECT_LEVELS.indexOf(a.level) - PROJECT_LEVELS.indexOf(b.level) ||
      a.currency.localeCompare(b.currency),
  );
  return { byLevel, textOnlyCount };
}
