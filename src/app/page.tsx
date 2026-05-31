// 看板(Dashboard)首页 —— Phase 5(server 组件)
//
// 汇总:关键数字卡 + 年度发表数(柱)+ 主题方向分布(饼)+ 各刊平均审稿周期(横向柱)
// + 当前在投一览 + 待办提醒(超期投稿 / 结题中·临近结题项目)。
// 依赖实时数据与「当前日期」,强制动态渲染。
import Link from "next/link";
import type { ReactNode } from "react";
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
import { StatCard } from "@/components/dashboard/stat-card";
import {
  PublicationsBarChart,
  ReviewCycleChart,
  TagPieChart,
} from "@/components/dashboard/charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SubmissionStatusBadge } from "@/components/submissions/submission-badges";
import { ProjectStatusBadge } from "@/components/projects/project-badges";
import {
  getDashboardStats,
  getPublicationsByYear,
  getReviewCycleByJournal,
  getClosingProjects,
} from "@/db/queries/dashboard";
import { listTagsWithCounts } from "@/db/queries/tags";
import { listPendingSubmissions } from "@/db/queries/submissions";
import type { ProjectStatus } from "@/lib/constants";
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
  const [stats, pubByYear, cycles, closing, tagCounts, pending] =
    await Promise.all([
      getDashboardStats(),
      getPublicationsByYear(),
      getReviewCycleByJournal(),
      getClosingProjects(),
      listTagsWithCounts(),
      listPendingSubmissions(),
    ]);

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
          <StatCard icon={BadgeCheck} label="已发表" value={stats.publishedWorks} />
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
                        <ProjectStatusBadge status={p.status as ProjectStatus} />
                        <span className="text-xs text-muted-foreground">
                          {p.end_date ? `截止 ${formatDate(p.end_date)}` : "未设截止"}
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
