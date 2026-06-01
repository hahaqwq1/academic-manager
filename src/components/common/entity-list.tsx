"use client";

// 泛型实体列表 —— P3-11(works / projects 列表共用)
//
// 两个列表此前结构几乎一致:useOptimistic 乐观删除 + Linear 风列表行 + 编辑链接 + 危险删除二次确认。
// 差异仅在「徽标 / 元信息 / 链接 / 删除文案」,故抽成泛型壳,差异点以 render prop / getter 注入。
// 乐观删除语义保持不变:确认后立即从列表移除该行,再 await onDelete;失败时下一次 server 数据回流自然恢复。
import { useOptimistic, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";

export interface EntityListProps<T> {
  items: T[];
  // 稳定主键 / 标题(用于 key、乐观过滤、删除文案与 toast)。
  getId: (item: T) => number;
  getTitle: (item: T) => string;
  // 详情 / 编辑链接。
  getDetailHref: (item: T) => string;
  getEditHref: (item: T) => string;
  // 标题行右侧徽标、第二行元信息(作者 / 编号 / 更新时间 / 标签等)。
  renderBadges: (item: T) => ReactNode;
  renderMeta: (item: T) => ReactNode;
  // 删除:server action(返回 { ok, message? })、对话框标题与逐项描述。
  onDelete: (id: number) => Promise<{ ok: boolean; message?: string }>;
  deleteTitle: string;
  getDeleteDescription: (item: T) => string;
}

export function EntityList<T>({
  items,
  getId,
  getTitle,
  getDetailHref,
  getEditHref,
  renderBadges,
  renderMeta,
  onDelete,
  deleteTitle,
  getDeleteDescription,
}: EntityListProps<T>) {
  const [isPending, startTransition] = useTransition();

  // 乐观列表:删除时立即移除目标行。
  const [optimisticItems, removeOptimistic] = useOptimistic(
    items,
    (current: T[], removedId: number) =>
      current.filter((item) => getId(item) !== removedId)
  );

  // 删除:乐观移除 → 调 server action → 反馈。
  const handleDelete = (id: number, title: string) => {
    startTransition(async () => {
      removeOptimistic(id);
      const result = await onDelete(id);
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
      {optimisticItems.map((item) => {
        const id = getId(item);
        const title = getTitle(item);
        return (
          <li
            key={id}
            className="group flex flex-col gap-3 bg-card px-4 py-3.5 transition-colors hover:bg-muted/40 focus-within:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
          >
            {/* 主体:标题 + 徽标 + 元信息 */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={getDetailHref(item)}
                  className="truncate rounded-sm text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {title}
                </Link>
                {renderBadges(item)}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {renderMeta(item)}
              </div>
            </div>

            {/* 操作区:触屏设备常显(无 hover);仅在支持 hover 的指针设备上默认弱化、悬停 / 聚焦时显现 */}
            <div className="flex shrink-0 items-center gap-1 hover-hover:sm:opacity-0 hover-hover:sm:transition-opacity hover-hover:sm:group-hover:opacity-100 hover-hover:sm:group-focus-within:opacity-100">
              <Button variant="ghost" size="sm" asChild>
                <Link href={getEditHref(item)}>
                  <Pencil />
                  编辑
                </Link>
              </Button>
              <ConfirmDialog
                destructive
                title={deleteTitle}
                description={getDeleteDescription(item)}
                confirmText="删除"
                onConfirm={() => handleDelete(id, title)}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`删除 ${title}`}
                  >
                    <Trash2 />
                    删除
                  </Button>
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
