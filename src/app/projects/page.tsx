// 项目列表页 —— Phase 3(server 组件)
//
// 从 URL searchParams(Next 16:Promise,须 await)解析筛选条件:
// - level / status:不属枚举则忽略。
// - tag / page:转 number,非法则忽略 / 回退到 1。
// 调 listProjects(...) 取分页数据 + listAllTags() 供筛选器渲染选项。
import type { Metadata } from "next";
import Link from "next/link";

import { FolderKanban, Plus, SearchX } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ProjectsFilters } from "@/components/projects/projects-filters";
import { ProjectsList } from "@/components/projects/projects-list";
import { Button } from "@/components/ui/button";
import { listProjects } from "@/db/queries/projects";
import { listAllTags } from "@/db/queries/tags";
import {
  PROJECT_LEVELS,
  PROJECT_STATUSES,
  type ProjectLevel,
  type ProjectStatus,
} from "@/lib/constants";

export const metadata: Metadata = { title: "项目" };

interface ProjectsPageProps {
  searchParams: Promise<{
    q?: string;
    level?: string;
    status?: string;
    tag?: string;
    page?: string;
  }>;
}

function parseLevel(value: string | undefined): ProjectLevel | undefined {
  return value && (PROJECT_LEVELS as readonly string[]).includes(value)
    ? (value as ProjectLevel)
    : undefined;
}

function parseStatus(value: string | undefined): ProjectStatus | undefined {
  return value && (PROJECT_STATUSES as readonly string[]).includes(value)
    ? (value as ProjectStatus)
    : undefined;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const sp = await searchParams;

  const q = sp.q?.trim() ? sp.q.trim() : undefined;
  const level = parseLevel(sp.level);
  const status = parseStatus(sp.status);
  const tagId = parsePositiveInt(sp.tag);
  const page = parsePositiveInt(sp.page) ?? 1;

  const [result, allTags] = await Promise.all([
    listProjects({ q, level, status, tagId, page }),
    listAllTags(),
  ]);

  const hasFilters =
    q !== undefined ||
    level !== undefined ||
    status !== undefined ||
    tagId !== undefined;

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (level) params.set("level", level);
    if (status) params.set("status", status);
    if (tagId !== undefined) params.set("tag", String(tagId));
    if (targetPage > 1) params.set("page", String(targetPage));
    const queryString = params.toString();
    return queryString ? `/projects?${queryString}` : "/projects";
  };

  const hasPrev = result.page > 1;
  const hasNext = result.pageCount > 0 && result.page < result.pageCount;

  return (
    <>
      <PageHeader
        title="项目"
        description="课题与项目,及其产出成果的挂接。"
        action={
          <Button asChild size="sm">
            <Link href="/projects/new">
              <Plus />
              新建项目
            </Link>
          </Button>
        }
      />

      <ProjectsFilters allTags={allTags} />

      {result.items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={SearchX}
            title="无匹配结果"
            description="没有符合当前筛选条件的项目,试试调整或清除筛选。"
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/projects">清除筛选</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FolderKanban}
            title="还没有项目"
            description="新建你的第一个课题 / 项目,开始管理立项与结题成果。"
            action={
              <Button asChild size="sm">
                <Link href="/projects/new">
                  <Plus />
                  新建项目
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="space-y-4">
          <ProjectsList items={result.items} />

          {result.pageCount > 1 ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                共 {result.total} 条 · 第 {result.page} / {result.pageCount} 页
              </p>
              <div className="flex items-center gap-2">
                {hasPrev ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={buildPageHref(result.page - 1)}>上一页</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    上一页
                  </Button>
                )}
                {hasNext ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={buildPageHref(result.page + 1)}>下一页</Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    下一页
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              共 {result.total} 条
            </p>
          )}
        </div>
      )}
    </>
  );
}
