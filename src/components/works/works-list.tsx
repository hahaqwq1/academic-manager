"use client";

// 作品列表 —— Phase 2 [L] / P3-11 改为泛型 EntityList 的薄包装
//
// 仅声明作品域的差异点(徽标 / 元信息 / 链接 / 删除文案),通用的乐观删除与行布局由 EntityList 承担。
import { User } from "lucide-react";

import { EntityList } from "@/components/common/entity-list";
import { Badge } from "@/components/ui/badge";
import { WorkStatusBadge, WorkTypeBadge } from "@/components/works/work-badges";
import { deleteWork } from "@/lib/actions/works";
import type { WorkWithTags } from "@/db/queries/works";
import { formatDate } from "@/lib/format";

interface WorksListProps {
  items: WorkWithTags[];
}

export function WorksList({ items }: WorksListProps) {
  return (
    <EntityList
      items={items}
      getId={(work) => work.id}
      getTitle={(work) => work.title}
      getDetailHref={(work) => `/works/${work.id}`}
      getEditHref={(work) => `/works/${work.id}/edit`}
      onDelete={deleteWork}
      deleteTitle="删除作品"
      getDeleteDescription={(work) =>
        `确定删除「${work.title}」吗?该作品的投稿记录与项目关联将一并删除,此操作不可撤销。`
      }
      renderBadges={(work) => (
        <>
          <WorkTypeBadge type={work.type} />
          <WorkStatusBadge status={work.status} />
        </>
      )}
      renderMeta={(work) => (
        <>
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
        </>
      )}
    />
  );
}
