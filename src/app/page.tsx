// 看板(Dashboard)首页 —— Phase 5(server 组件)
//
// 汇总:关键数字卡 + 年度发表数(柱)+ 主题方向分布(饼)+ 各刊平均审稿周期(横向柱)
// + 当前在投一览 + 待办提醒(超期投稿 / 结题中·临近结题项目)。
// 依赖实时数据与「当前日期」,强制动态渲染。
import type { ReactNode } from "react";
import Link from "next/link";

import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  FileText,
  FolderKanban,
  Send,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import {
  CumulativePublicationsChart,
  FundingByLevelChart,
  PublicationRolePie,
  PublicationsBarChart,
  PublicationTypePie,
  ReviewCycleChart,
  SubmissionOutcomePie,
  SubmissionTrendChart,
  TagPieChart,
} from "@/components/dashboard/charts-lazy";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProjectStatusBadge } from "@/components/projects/project-badges";
import { SubmissionStatusBadge } from "@/components/submissions/submission-badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  getAcceptanceRate,
  getCumulativePublicationsByYear,
  getFundingSummary,
  getPublicationsByAuthorRole,
  getPublicationsByType,
  getSubmissionOutcomes,
  getSubmissionTrendByYear,
} from "@/db/queries/analytics";
import {
  getClosingProjects,
  getDashboardStats,
  getPublicationDataHealth,
  getPublicationsByYear,
  getReviewCycleByJournal,
} from "@/db/queries/dashboard";
import { listPendingSubmissions } from "@/db/queries/submissions";
import { listTagsWithCounts } from "@/db/queries/tags";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// 看板用带标题的卡片容器。
function DashCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint ? (
            <span className="text-xs text-muted-foreground">{hint}</span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [
    stats,
    pubByYear,
    pubHealth,
    cycles,
    closing,
    tagCounts,
    pending,
    outcomes,
    acceptance,
    subTrend,
    pubByRole,
    pubByType,
    cumulative,
    funding,
  ] = await Promise.all([
    getDashboardStats(),
    getPublicationsByYear(),
    getPublicationDataHealth(),
    getReviewCycleByJournal(),
    getClosingProjects(),
    listTagsWithCounts(),
    listPendingSubmissions(),
    getSubmissionOutcomes(),
    getAcceptanceRate(),
    getSubmissionTrendByYear(),
    getPublicationsByAuthorRole(),
    getPublicationsByType(),
    getCumulativePublicationsByYear(),
    getFundingSummary(),
  ]);

  // 年度图口径外的发表数据(仅在存在时提示,空库/干净数据不打扰)。
  const pubHealthMsgs: string[] = [];
  if (pubHealth.publishedMissingDate > 0) {
    pubHealthMsgs.push(
      `${pubHealth.publishedMissingDate} 件「已发表」未填发表日期`,
    );
  }
  if (pubHealth.datedNotPublished > 0) {
    pubHealthMsgs.push(
      `${pubHealth.datedNotPublished} 件填了发表日期但状态非「已发表」`,
    );
  }

  // 主题方向分布:作品 + 项目计数 > 0 的标签。
  const tagDist = tagCounts
    .map((t) => ({ name: t.name, count: t.workCount + t.projectCount }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  const overdue = pending.filter((s) => s.isOverdue);
  const hasTodos = overdue.length > 0 || closing.length > 0;

  return (
    <>
      <PageHeader title="看板" description="科研全景一览。" />

      <div className="space-y-6">
        {/* 关键数字 */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={FileText} label="作品总数" value={stats.totalWorks} />
          <StatCard
            icon={BadgeCheck}
            label="已发表"
            value={stats.publishedWorks}
          />
          <StatCard
            icon={Send}
            label="在投"
            value={stats.pendingSubmissions}
            hint="在审"
          />
          <StatCard
            icon={FolderKanban}
            label="项目总数"
            value={stats.totalProjects}
          />
        </div>

        {/* 图表行 1 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashCard title="年度发表数">
            {pubHealthMsgs.length > 0 ? (
              <Link
                href="/health"
                className="mb-3 flex items-start gap-1.5 text-xs text-warning transition-colors hover:text-warning/80"
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {pubHealthMsgs.join(";")},未计入年度统计 · 数据体检 →
                </span>
              </Link>
            ) : null}
            <PublicationsBarChart data={pubByYear} />
          </DashCard>
          <DashCard title="主题方向分布">
            <TagPieChart data={tagDist} />
          </DashCard>
        </div>

        {/* 图表行 2 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashCard title="各刊平均审稿周期">
            <ReviewCycleChart data={cycles} />
          </DashCard>
          <DashCard title="当前在投" hint={`${pending.length} 篇在审`}>
            {pending.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                当前没有在审的投稿。
              </p>
            ) : (
              <ul className="space-y-2.5">
                {pending.slice(0, 6).map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <Link
                      href={`/works/${s.work_id}`}
                      className="truncate font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {s.work_title}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {s.journal}
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-1.5">
                      {s.isOverdue ? (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 bg-destructive/10 font-medium text-destructive"
                        >
                          超期 {s.daysElapsed} 天
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {s.daysElapsed} 天
                        </span>
                      )}
                      <SubmissionStatusBadge status="在审" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DashCard>
        </div>

        {/* 科研分析 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            科研分析
          </h3>

          {/* 投稿:录用率 + 结果分布 + 逐年投稿量 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <DashCard title="投稿录用率" hint={`已决 ${acceptance.decided} 篇`}>
              <div className="flex h-64 flex-col items-center justify-center gap-2">
                <span className="text-4xl font-bold text-foreground">
                  {acceptance.decided === 0
                    ? "—"
                    : `${Math.round(acceptance.rate * 100)}%`}
                </span>
                <span className="text-sm text-muted-foreground">
                  录用 {acceptance.accepted} · 被拒 {acceptance.rejected}
                </span>
              </div>
            </DashCard>
            <DashCard title="投稿结果分布">
              <SubmissionOutcomePie data={outcomes} />
            </DashCard>
            <DashCard title="逐年投稿量">
              <SubmissionTrendChart data={subTrend} />
            </DashCard>
          </div>

          {/* 发表:累计曲线 + 作者角色 + 类型 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <DashCard title="累计发表">
              <CumulativePublicationsChart data={cumulative} />
            </DashCard>
            <DashCard title="作者角色分布">
              <PublicationRolePie data={pubByRole} />
            </DashCard>
            <DashCard title="发表类型分布">
              <PublicationTypePie data={pubByType} />
            </DashCard>
          </div>

          {/* 经费汇总 */}
          <DashCard
            title="经费汇总(按级别 / 币种)"
            hint={
              funding.textOnlyCount > 0
                ? `${funding.textOnlyCount} 个项目仅有文本经费,未计入`
                : undefined
            }
          >
            <FundingByLevelChart data={funding.byLevel} />
          </DashCard>
        </div>

        {/* 待办提醒 */}
        <DashCard title="待办提醒">
          {!hasTodos ? (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-success">
              <CheckCircle2 className="size-4" />
              暂无待办,一切就绪。
            </p>
          ) : (
            <div className="space-y-4">
              {overdue.length > 0 ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="size-3.5" />
                    超期未决投稿({overdue.length})
                  </p>
                  <ul className="space-y-1.5">
                    {overdue.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                      >
                        <Link
                          href={`/works/${s.work_id}`}
                          className="font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {s.work_title}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          投于 {s.journal} · 已历 {s.daysElapsed} 天
                        </span>
                        <Badge
                          variant="outline"
                          className="border-destructive/30 bg-destructive/10 font-medium text-destructive"
                        >
                          超期
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {closing.length > 0 ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
                    <CalendarClock className="size-3.5" />
                    结题 / 临近结题项目({closing.length})
                  </p>
                  <ul className="space-y-1.5">
                    {closing.map((p) => (
                      <li
                        key={p.id}
                        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                      >
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {p.title}
                        </Link>
                        <ProjectStatusBadge status={p.status} />
                        <span className="text-xs text-muted-foreground">
                          {p.end_date
                            ? `截止 ${formatDate(p.end_date)}`
                            : "未设截止"}
                          {p.daysToDeadline !== null
                            ? p.daysToDeadline < 0
                              ? ` · 已过期 ${-p.daysToDeadline} 天`
                              : ` · 剩 ${p.daysToDeadline} 天`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </DashCard>
      </div>
    </>
  );
}
