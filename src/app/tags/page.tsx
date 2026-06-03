// 标签页 —— Phase 4(server 组件)
//
// 上半部:标签管理(新建 / 重命名 / 删除,client 组件 TagsManager)。
// 下半部:按主题浏览 —— ?tag=id 选中某标签后,列出其下的作品与项目(论文 + 项目混合检索)。
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/common/page-header";
import { TagsManager } from "@/components/tags/tags-manager";
import { WorkStatusBadge, WorkTypeBadge } from "@/components/works/work-badges";
import {
  ProjectLevelBadge,
  ProjectStatusBadge,
} from "@/components/projects/project-badges";
import { listTagsWithCounts, getEntitiesByTag } from "@/db/queries/tags";

export const metadata: Metadata = { title: "标签" };

interface TagsPageProps {
  searchParams: Promise<{ tag?: string }>;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export default async function TagsPage({ searchParams }: TagsPageProps) {
  const sp = await searchParams;
  const tagId = parsePositiveInt(sp.tag);

  const [tags, entities] = await Promise.all([
    listTagsWithCounts(),
    tagId !== undefined ? getEntitiesByTag(tagId) : Promise.resolve(null),
  ]);

  const totalUnderTag = entities
    ? entities.works.length + entities.projects.length
    : 0;

  return (
    <>
      <PageHeader
        title="标签"
        description="管理主题标签,并按方向浏览论文与项目。"
      />

      <div className="space-y-8">
        <TagsManager tags={tags} activeTagId={tagId} />

        {/* 按主题浏览 */}
        {entities ? (
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              「{entities.tag.name}」下的成果
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                作品 {entities.works.length} · 项目 {entities.projects.length}
              </span>
            </h3>

            {totalUnderTag === 0 ? (
              <p className="text-sm text-muted-foreground">
                该标签下暂无作品或项目。可在作品 / 项目的编辑页为其打上此标签。
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* 作品 */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    作品
                  </p>
                  {entities.works.length === 0 ? (
                    <p className="text-sm text-muted-foreground">—</p>
                  ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-lg ring-1 ring-foreground/10">
                      {entities.works.map((w) => (
                        <li
                          key={w.id}
                          className="flex flex-wrap items-center gap-2 bg-card px-3 py-2.5"
                        >
                          <Link
                            href={`/works/${w.id}`}
                            className="truncate rounded-sm text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            {w.title}
                          </Link>
                          <WorkTypeBadge type={w.type} />
                          <WorkStatusBadge status={w.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 项目 */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    项目
                  </p>
                  {entities.projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">—</p>
                  ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-lg ring-1 ring-foreground/10">
                      {entities.projects.map((p) => (
                        <li
                          key={p.id}
                          className="flex flex-wrap items-center gap-2 bg-card px-3 py-2.5"
                        >
                          <Link
                            href={`/projects/${p.id}`}
                            className="truncate rounded-sm text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            {p.title}
                          </Link>
                          <ProjectLevelBadge level={p.level} />
                          <ProjectStatusBadge status={p.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">
            点击上方任一标签,查看其下挂的论文与项目。
          </p>
        )}
      </div>
    </>
  );
}
