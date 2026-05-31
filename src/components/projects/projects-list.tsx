"use client";

// 项目列表 —— Phase 3
//
// 与作品列表同构:Linear 风列表行 + useOptimistic 乐观删除。
// 每行:名称(链接详情)+ 级别 / 状态 / 角色徽标 + 编号 / 经费 + 更新时间 + 标签;
// 右侧操作:编辑(链接)+ 删除(ConfirmDialog 二次确认,危险样式)。
import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ProjectLevelBadge,
  ProjectRoleBadge,
  ProjectStatusBadge,
} from "@/components/projects/project-badges";
import { deleteProject } from "@/lib/actions/projects";
import type { ProjectWithTags } from "@/db/queries/projects";
import type { ProjectLevel, ProjectRole, ProjectStatus } from "@/lib/constants";
import { formatDate } from "@/lib/format";

interface ProjectsListProps {
  items: ProjectWithTags[];
}

export function ProjectsList({ items }: ProjectsListProps) {
  const [isPending, startTransition] = useTransition();

  const [optimisticItems, removeOptimistic] = useOptimistic(
    items,
    (current: ProjectWithTags[], removedId: number) =>
      current.filter((item) => item.id !== removedId)
  );

  const handleDelete = (id: number, title: string) => {
    startTransition(async () => {
      removeOptimistic(id);
      const result = await deleteProject(id);
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
      {optimisticItems.map((project) => (
        <li
          key={project.id}
          className="group flex flex-col gap-3 bg-card px-4 py-3.5 transition-colors hover:bg-muted/40 focus-within:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/projects/${project.id}`}
                className="truncate rounded-sm text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {project.title}
              </Link>
              <ProjectLevelBadge level={project.level as ProjectLevel} />
              <ProjectStatusBadge status={project.status as ProjectStatus} />
              <ProjectRoleBadge role={project.role as ProjectRole} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {project.grant_no ? <span>编号 {project.grant_no}</span> : null}
              {project.funding ? <span>经费 {project.funding}</span> : null}
              <span>更新于 {formatDate(project.updated_at)}</span>
              {project.tags.length > 0 ? (
                <span className="flex flex-wrap items-center gap-1">
                  {project.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="font-normal">
                      {tag.name}
                    </Badge>
                  ))}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 hover-hover:sm:opacity-0 hover-hover:sm:transition-opacity hover-hover:sm:group-hover:opacity-100 hover-hover:sm:group-focus-within:opacity-100">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects/${project.id}/edit`}>
                <Pencil />
                编辑
              </Link>
            </Button>
            <ConfirmDialog
              destructive
              title="删除项目"
              description={`确定删除「${project.title}」吗?该项目的成果挂接与标签关联将一并移除,此操作不可撤销。`}
              confirmText="删除"
              onConfirm={() => handleDelete(project.id, project.title)}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`删除 ${project.title}`}
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
