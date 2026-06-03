// 数据体检页 —— 升级线(数据完整性 + 体验层,server 组件)
//
// 集中展示 DB 允许、但口径/语义可疑的数据(见 @/db/queries/health 的 5 类),
// 每条尽量深链到对应实体详情页或筛选列表,便于一处订正。依赖实时数据,强制动态渲染。
import type { Metadata } from "next";
import Link from "next/link";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarX,
  ClipboardList,
  DatabaseBackup,
  Link2Off,
  Send,
  ShieldCheck,
} from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { OrphanCleanupButton } from "@/components/health/orphan-cleanup-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  getHealthReport,
  type HealthEntityRef,
  type OrphanTagRef,
} from "@/db/queries/health";
import { type BackupStatus, getBackupStatus } from "@/lib/backup";

export const metadata: Metadata = { title: "数据体检" };
export const dynamic = "force-dynamic";

// 单类问题的容器卡:图标 + 标题 + 计数角标 + 说明 + 可选「跳转到筛选列表」+ 明细。
function HealthSection({
  icon: Icon,
  title,
  description,
  count,
  jump,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  count: number;
  jump?: { href: string; label: string };
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="size-4 shrink-0 text-warning" />
              {title}
              <Badge
                variant="outline"
                className="border-warning/30 bg-warning/10 font-medium text-warning"
              >
                {count}
              </Badge>
            </h3>
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Icon className="mt-0.5 size-3.5 shrink-0" />
              <span>{description}</span>
            </p>
          </div>
          {action || jump ? (
            <div className="flex shrink-0 items-center gap-2">
              {jump ? (
                <Link
                  href={jump.href}
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  {jump.label}
                  <ArrowRight className="size-3" />
                </Link>
              ) : null}
              {action}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// 指向作品/项目详情页的明细列表。
function EntityRefList({ items }: { items: HealthEntityRef[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li
          key={`${it.kind}-${it.id}-${i}`}
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
        >
          <Link
            href={`/${it.kind === "work" ? "works" : "projects"}/${it.id}`}
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            {it.title}
          </Link>
          {it.detail ? (
            <span className="text-xs text-muted-foreground">{it.detail}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

// 孤儿标签关联:实体已不存在,无处可跳,仅诊断展示。
function OrphanList({ items }: { items: OrphanTagRef[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.id} className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className="font-medium text-foreground">
            标签「{it.tagName}」
          </span>
          <span className="text-xs text-muted-foreground">
            指向不存在的{it.entity_type === "work" ? "作品" : "项目"} #
            {it.entity_id}
          </span>
        </li>
      ))}
    </ul>
  );
}

// 容灾状态卡:最近备份时间 + 份数 + 异地副本提醒(总是显示,即便数据健康)。
function timeAgo(iso: string | null): string {
  if (!iso) return "尚无备份";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  return `${days} 天前`;
}

function BackupStatusCard({ status }: { status: BackupStatus }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <DatabaseBackup className="size-4 shrink-0 text-info" />
          容灾状态
        </h3>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {status.latestFile ? (
          <p className="text-sm">
            最近自动备份:
            <span className="font-medium">{status.latestFile}</span>(
            {timeAgo(status.latestMtime)})· 共 {status.count} 份
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            尚无自动备份(应用启动时会生成当天备份)。
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          备份目录:{status.dir}
          。所有备份与主库同盘,只防误删/逻辑损坏,不防介质丢失——
          建议定期把该目录复制到 U 盘 / 网盘等异地位置。
        </p>
      </CardContent>
    </Card>
  );
}

export default async function HealthPage() {
  const report = await getHealthReport();
  const backup = getBackupStatus();

  if (report.totalIssues === 0) {
    return (
      <>
        <PageHeader
          title="数据体检"
          description="集中检查口径外与语义异常的数据。"
        />
        <div className="space-y-4">
          <BackupStatusCard status={backup} />
          <EmptyState
            icon={ShieldCheck}
            title="数据健康"
            description="未发现任何异常,各项口径自洽。新增 / 导入数据后可随时回来复检。"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="数据体检"
        description={`发现 ${report.totalIssues} 处可订正项 —— 点击条目跳转修订。`}
      />

      <div className="space-y-4">
        <BackupStatusCard status={backup} />
        {report.publishedMissingDate.length > 0 ? (
          <HealthSection
            icon={CalendarX}
            title="已发表缺发表日期"
            count={report.publishedMissingDate.length}
            description="计入「已发表」却因缺日期不进年度发表图;补填发表日期即可归位。"
            jump={{ href: "/works?status=已发表", label: "全部已发表" }}
          >
            <EntityRefList items={report.publishedMissingDate} />
          </HealthSection>
        ) : null}

        {report.datedNotPublished.length > 0 ? (
          <HealthSection
            icon={AlertTriangle}
            title="有发表日期但状态非已发表"
            count={report.datedNotPublished.length}
            description="填了发表日期却不在「已发表」口径;核对状态,或清空日期。"
          >
            <EntityRefList items={report.datedNotPublished} />
          </HealthSection>
        ) : null}

        {report.worksSubmittingNoSubmission.length > 0 ? (
          <HealthSection
            icon={Send}
            title="标为投稿中却无投稿记录"
            count={report.worksSubmittingNoSubmission.length}
            description="状态=投稿中但未录入任何投稿轮次;补录投稿,或调整状态。"
            jump={{ href: "/works?status=投稿中", label: "全部投稿中" }}
          >
            <EntityRefList items={report.worksSubmittingNoSubmission} />
          </HealthSection>
        ) : null}

        {report.submissionsDecidedButPending.length > 0 ? (
          <HealthSection
            icon={ClipboardList}
            title="投稿已出决定却仍在审"
            count={report.submissionsDecidedButPending.length}
            description="投稿填了决定日期但状态仍为「在审」;更新为录用 / 退修 / 被拒。"
          >
            <EntityRefList items={report.submissionsDecidedButPending} />
          </HealthSection>
        ) : null}

        {report.orphanEntityTags.length > 0 ? (
          <HealthSection
            icon={Link2Off}
            title="孤儿标签关联"
            count={report.orphanEntityTags.length}
            description="标签指向已不存在的作品/项目(多态引用无外键守护);可一键清理或重新导入修复。"
            action={
              <OrphanCleanupButton count={report.orphanEntityTags.length} />
            }
          >
            <OrphanList items={report.orphanEntityTags} />
          </HealthSection>
        ) : null}
      </div>
    </>
  );
}
