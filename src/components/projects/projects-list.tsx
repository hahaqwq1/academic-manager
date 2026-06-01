"use client";

// 项目列表 —— Phase 3 / P3-11 改为泛型 EntityList 的薄包装
//
// 仅声明项目域的差异点(徽标 / 元信息 / 链接 / 删除文案),通用的乐观删除与行布局由 EntityList 承担。
import { EntityList } from "@/components/common/entity-list";
import { Badge } from "@/components/ui/badge";
import {
  ProjectLevelBadge,
  ProjectRoleBadge,
  ProjectStatusBadge,
} from "@/components/projects/project-badges";
import { deleteProject } from "@/lib/actions/projects";
import type { ProjectWithTags } from "@/db/queries/projects";
import { formatDate } from "@/lib/format";

interface ProjectsListProps {
  items: ProjectWithTags[];
}

export function ProjectsList({ items }: ProjectsListProps) {
  return (
    <EntityList
      items={items}
      getId={(project) => project.id}
      getTitle={(project) => project.title}
      getDetailHref={(project) => `/projects/${project.id}`}
      getEditHref={(project) => `/projects/${project.id}/edit`}
      onDelete={deleteProject}
      deleteTitle="删除项目"
      getDeleteDescription={(project) =>
        `确定删除「${project.title}」吗?该项目的成果挂接与标签关联将一并移除,此操作不可撤销。`
      }
      renderBadges={(project) => (
        <>
          <ProjectLevelBadge level={project.level} />
          <ProjectStatusBadge status={project.status} />
          <ProjectRoleBadge role={project.role} />
        </>
      )}
      renderMeta={(project) => (
        <>
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
        </>
      )}
    />
  );
}
