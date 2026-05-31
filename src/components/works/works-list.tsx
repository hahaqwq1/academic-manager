"use client";

// 作品列表 —— Phase 2 [L]
//
// Linear 风列表行(分隔行 + 卡片容器)。用 useOptimistic 支撑乐观删除:
// 用户确认删除后立刻从列表移除该行,再 await deleteWork(id);失败则在下一次
// server 数据回流时自然恢复(useOptimistic 的乐观值在 transition 结束后丢弃)。
//
// 每行:标题(链接详情)+ 类型 / 状态徽标 + 作者 + 更新时间 + 标签;
// 右侧操作:编辑(链接)+ 删除(ConfirmDialog 触发,危险样式)。
import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkStatusBadge, WorkTypeBadge } from "@/components/works/work-badges";
import { deleteWork } from "@/lib/actions/works";
import type { WorkWithTags } from "@/db/queries/works";
import { formatDate } from "@/lib/format";

interface WorksListProps {
  items: WorkWithTags[];
}

export function WorksList({ items }: WorksListProps) {
  const [isPending, startTransition] = useTransition();

  // 乐观列表:删除时立即移除目标行。
  const [optimisticItems, removeOptimistic] = useOptimistic(
    items,
    (current: WorkWithTags[], removedId: number) =>
      current.filter((item) => item.id !== removedId)
  );

  // 删除:乐观移除 → 调 server action → 反馈。
  const handleDelete = (id: number, title: string) => {
    startTransition(async () => {
      removeOptimistic(id);
      const result = await deleteWork(id);
      if (result.ok) {
        toast.success(`已删除「${title}」`);
      } else {
        toast.error(result.message ?? "删除失败,请重试");
      }
    });
  };

  return (
    <ul
      className="divide-y divide-border overflow-hidden rounded-xl ring-1 ring-foreground/10"
      aria-busy={isPending}
    >
      {optimisticItems.map((work) => (
        <li
          key={work.id}
          className="group flex flex-col gap-3 bg-card px-4 py-3.5 transition-colors hover:bg-muted/40 focus-within:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
        >
          {/* 主体:标题 + 徽标 + 元信息 */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/works/${work.id}`}
                className="truncate rounded-sm text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {work.title}
              </Link>
              <WorkTypeBadge type={work.type as Parameters<typeof WorkTypeBadge>[0]["type"]} />
              <WorkStatusBadge
                status={work.status as Parameters<typeof WorkStatusBadge>[0]["status"]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {work.authors ? (
                <span className="inline-flex max-w-[16rem] items-center gap-1 truncate">
                  <User className="size-3 shrink-0" />
                  <span className="truncate">{work.authors}</span>
                </span>
              ) : null}
              <span>更新于 {formatDate(work.updated_at)}</span>
              {work.tags.length > 0 ? (
                <span className="flex flex-wrap items-center gap-1">
                  {work.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="font-normal">
                      {tag.name}
                    </Badge>
                  ))}
                </span>
              ) : null}
            </div>
          </div>

          {/* 操作区:触屏设备常显(无 hover);仅在支持 hover 的指针设备上默认弱化、悬停 / 聚焦时显现 */}
          <div className="flex shrink-0 items-center gap-1 hover-hover:sm:opacity-0 hover-hover:sm:transition-opacity hover-hover:sm:group-hover:opacity-100 hover-hover:sm:group-focus-within:opacity-100">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/works/${work.id}/edit`}>
                <Pencil />
                编辑
              </Link>
            </Button>
            <ConfirmDialog
              destructive
              title="删除作品"
              description={`确定删除「${work.title}」吗?该作品的投稿记录与项目关联将一并删除,此操作不可撤销。`}
              confirmText="删除"
              onConfirm={() => handleDelete(work.id, work.title)}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`删除 ${work.title}`}
                >
                  <Trash2 />
                  删除
                </Button>
              }
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
