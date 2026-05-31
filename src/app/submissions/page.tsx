// 在投全局视图 —— Phase 4(server 组件)
//
// 汇总所有「在审且未出结果」的投稿,按超期优先 + 已历天数倒序排列。
// 超期(已历 > OVERDUE_DAYS 天)条目用危险色高亮,顶部给出总数与超期数概览。
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { SubmissionStatusBadge } from "@/components/submissions/submission-badges";
import { WorkTypeBadge } from "@/components/works/work-badges";
import { listPendingSubmissions } from "@/db/queries/submissions";
import { OVERDUE_DAYS, type WorkType } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "在投" };

// 依赖实时数据与「当前日期」(超期天数计算),强制动态渲染,避免被静态烘焙冻结。
export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const pending = await listPendingSubmissions();
  const overdueCount = pending.filter((s) => s.isOverdue).length;

  return (
    <>
      <PageHeader
        title="在投"
        description={`所有在审且未出结果的投稿;超过 ${OVERDUE_DAYS} 天未决视为超期。`}
      />

      {pending.length === 0 ? (
        <EmptyState
          icon={Send}
          title="暂无在投记录"
          description="当前没有「在审且未出结果」的投稿。在作品详情页可记录新的投稿轮次。"
        />
      ) : (
        <div className="space-y-4">
          {/* 概览条 */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Send className="size-4" />共 {pending.length} 篇在审
            </span>
            {overdueCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                <AlertTriangle className="size-4" />
                {overdueCount} 篇已超期
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-success">
                <CheckCircle2 className="size-4" />
                无超期
              </span>
            )}
          </div>

          <ul className="space-y-2.5">
            {pending.map((s) => (
              <li
                key={s.id}
                className={cn(
                  "rounded-xl border bg-card px-4 py-3.5 ring-1 ring-foreground/5 transition-colors",
                  s.isOverdue
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/works/${s.work_id}`}
                    className="rounded-sm text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {s.work_title}
                  </Link>
                  <WorkTypeBadge type={s.work_type as WorkType} />
                  <SubmissionStatusBadge status="在审" />
                  {s.isOverdue ? (
                    <Badge
                      variant="outline"
                      className="border-destructive/30 bg-destructive/10 font-medium text-destructive"
                    >
                      <AlertTriangle className="size-3" />
                      超期 {s.daysElapsed} 天
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    {s.journal}
                  </span>
                  <span>第 {s.round} 轮</span>
                  <span>投于 {formatDate(s.submitted_at)}</span>
                  <span className={s.isOverdue ? "text-destructive" : undefined}>
                    已历 {s.daysElapsed} 天
                  </span>
                </div>
                {s.review_notes ? (
                  <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {s.review_notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
