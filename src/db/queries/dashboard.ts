// 看板数据聚合 —— Phase 5
//
// 为首页看板的各组件提供聚合数据:
//   - getDashboardStats:总作品 / 已发表 / 在投(在审)/ 项目数 概览。
//   - getPublicationsByYear:按 published_at 年份统计已发表作品数(柱状图)。
//   - getReviewCycleByJournal:各期刊平均审稿周期(由已出结果的投稿 decided-submitted 计算)。
//   - getClosingProjects:结题中 / 临近结题(end_date 在未来 90 天内或已过期且未结题)的项目(待办)。
// 标签分布复用 listTagsWithCounts;在投 / 超期复用 listPendingSubmissions(见各自查询模块)。
import { and, count, eq, isNotNull, isNull, ne, notInArray } from "drizzle-orm";

import { db } from "@/db";
import { projects, submissions, works } from "@/db/schema";
import type { ProjectStatus } from "@/lib/constants";
import { DAY_MS, parseDateOnly, startOfToday } from "@/lib/format";

export interface DashboardStats {
  totalWorks: number;
  publishedWorks: number;
  totalProjects: number;
  pendingSubmissions: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const totalWorks =
    db.select({ value: count() }).from(works).all()[0]?.value ?? 0;
  const publishedWorks =
    db
      .select({ value: count() })
      .from(works)
      .where(eq(works.status, "已发表"))
      .all()[0]?.value ?? 0;
  const totalProjects =
    db.select({ value: count() }).from(projects).all()[0]?.value ?? 0;
  // 与 /submissions 在投视图(listPendingSubmissions)口径一致:在审且未出结果。
  const pendingSubmissions =
    db
      .select({ value: count() })
      .from(submissions)
      .where(
        and(eq(submissions.status, "在审"), isNull(submissions.decided_at)),
      )
      .all()[0]?.value ?? 0;

  return { totalWorks, publishedWorks, totalProjects, pendingSubmissions };
}

// 按年份的已发表作品数,年份升序。
export interface YearCount {
  year: string;
  count: number;
}

export async function getPublicationsByYear(): Promise<YearCount[]> {
  // 口径:status=已发表 且 published_at 非空 —— 是「已发表」作品里已填发表日期的子集
  //(年度柱必须有年份才能落桶)。注意它是 getDashboardStats.publishedWorks(全部已发表)的子集,
  // 而非与之相等:已发表但未填日期的作品计入头部「已发表」数字却不进年度图,
  // 二者之差由 getPublicationDataHealth 暴露(数据健康提示)。
  // 反之,仅靠 published_at 非空(不要求已发表)会把「填了日期但状态非已发表」的作品计入,
  // 与「已发表」口径打架,故用 status + 日期双条件。
  const rows = db
    .select({ published_at: works.published_at })
    .from(works)
    .where(and(eq(works.status, "已发表"), isNotNull(works.published_at)))
    .all();

  const byYear = new Map<string, number>();
  for (const r of rows) {
    const date = parseDateOnly(r.published_at);
    if (!date) continue;
    const year = String(date.getFullYear());
    byYear.set(year, (byYear.get(year) ?? 0) + 1);
  }

  return [...byYear.entries()]
    .map(([year, c]) => ({ year, count: c }))
    .sort((a, b) => a.year.localeCompare(b.year));
}

// 发表数据健康度:两类「口径外」数据,用于看板年度图旁的数据健康提示。
// 收紧年度图口径后,这两类作品都不进年度图,提示用户去补全/订正,避免「数字对不上」被误读为 bug。
export interface PublicationDataHealth {
  publishedMissingDate: number; // status=已发表 但 published_at 为空:计入「已发表」却缺席年度图
  datedNotPublished: number; // published_at 非空 但 status≠已发表:有发表日期却不在已发表口径
}

export async function getPublicationDataHealth(): Promise<PublicationDataHealth> {
  const publishedMissingDate =
    db
      .select({ value: count() })
      .from(works)
      .where(and(eq(works.status, "已发表"), isNull(works.published_at)))
      .all()[0]?.value ?? 0;
  const datedNotPublished =
    db
      .select({ value: count() })
      .from(works)
      .where(and(isNotNull(works.published_at), ne(works.status, "已发表")))
      .all()[0]?.value ?? 0;
  return { publishedMissingDate, datedNotPublished };
}

// 各期刊平均审稿周期(天),由已出结果(decided_at 非空)的投稿计算。
export interface JournalCycle {
  journal: string;
  avgDays: number;
  count: number;
}

export async function getReviewCycleByJournal(): Promise<JournalCycle[]> {
  const rows = db
    .select({
      journal: submissions.journal,
      submitted_at: submissions.submitted_at,
      decided_at: submissions.decided_at,
    })
    .from(submissions)
    .where(isNotNull(submissions.decided_at))
    .all();

  const agg = new Map<string, { totalDays: number; count: number }>();
  for (const r of rows) {
    const submitted = parseDateOnly(r.submitted_at);
    const decided = parseDateOnly(r.decided_at);
    if (!submitted || !decided) continue;
    const days = Math.max(
      0,
      Math.round((decided.getTime() - submitted.getTime()) / DAY_MS),
    );
    const cur = agg.get(r.journal) ?? { totalDays: 0, count: 0 };
    cur.totalDays += days;
    cur.count += 1;
    agg.set(r.journal, cur);
  }

  return [...agg.entries()]
    .map(([journal, { totalDays, count: c }]) => ({
      journal,
      avgDays: Math.round(totalDays / c),
      count: c,
    }))
    .sort((a, b) => b.avgDays - a.avgDays);
}

// 待办:结题中或临近结题(end_date 在未来 90 天内,或已过期)且尚未结题的项目。
export interface ClosingProject {
  id: number;
  title: string;
  status: ProjectStatus;
  end_date: string | null;
  daysToDeadline: number | null; // 负数表示已过期
  reason: "结题中" | "临近结题";
}

export async function getClosingProjects(): Promise<ClosingProject[]> {
  // 已结题 / 未中的项目不可能是待办,直接在 SQL 层下推排除,避免全表取出再 JS 过滤(P3-10)。
  const rows = db
    .select()
    .from(projects)
    .where(notInArray(projects.status, ["已结题", "未中"]))
    .all();
  const today = startOfToday();
  const result: ClosingProject[] = [];

  for (const p of rows) {
    const end = parseDateOnly(p.end_date);
    const daysToDeadline = end
      ? Math.round((end.getTime() - today.getTime()) / DAY_MS)
      : null;

    const isClosing = p.status === "结题中";
    const isNearDeadline = daysToDeadline !== null && daysToDeadline <= 90; // 未来90天内或已过期

    if (isClosing || isNearDeadline) {
      result.push({
        id: p.id,
        title: p.title,
        status: p.status,
        end_date: p.end_date,
        daysToDeadline,
        reason: isClosing ? "结题中" : "临近结题",
      });
    }
  }

  // 结题中优先,其次按截止日期临近程度。
  result.sort((a, b) => {
    if (a.reason !== b.reason) return a.reason === "结题中" ? -1 : 1;
    const da = a.daysToDeadline ?? Number.MAX_SAFE_INTEGER;
    const dbb = b.daysToDeadline ?? Number.MAX_SAFE_INTEGER;
    return da - dbb;
  });

  return result;
}
