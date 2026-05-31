// 作品列表页 —— Phase 2 [I](server 组件)
//
// 从 URL searchParams(Next 16:Promise,须 await)解析筛选条件:
// - type / status:不属枚举则忽略(避免脏参数污染查询)。
// - tag / page:转 number,非法则忽略 / 回退到 1。
// 调 listWorks(...) 取分页数据 + listAllTags() 供筛选器渲染选项。
// 三态:
// - 无数据且无筛选 → 引导新建的空状态。
// - 有筛选但无匹配 → 「无匹配结果」空状态(含清除筛选)。
// - 否则 → 列表 + 分页控件。
import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus, SearchX } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { WorksFilters } from "@/components/works/works-filters";
import { WorksList } from "@/components/works/works-list";
import { listWorks } from "@/db/queries/works";
import { listAllTags } from "@/db/queries/tags";
import {
  WORK_STATUSES,
  WORK_TYPES,
  type WorkStatus,
  type WorkType,
} from "@/lib/constants";

export const metadata: Metadata = { title: "作品" };

interface WorksPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    tag?: string;
    page?: string;
  }>;
}

// 把任意字符串收窄为合法 WorkType,否则 undefined。
function parseType(value: string | undefined): WorkType | undefined {
  return value && (WORK_TYPES as readonly string[]).includes(value)
    ? (value as WorkType)
    : undefined;
}

// 把任意字符串收窄为合法 WorkStatus,否则 undefined。
function parseStatus(value: string | undefined): WorkStatus | undefined {
  return value && (WORK_STATUSES as readonly string[]).includes(value)
    ? (value as WorkStatus)
    : undefined;
}

// 解析正整数;非法 / 越界 → undefined。
function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export default async function WorksPage({ searchParams }: WorksPageProps) {
  const sp = await searchParams;

  const q = sp.q?.trim() ? sp.q.trim() : undefined;
  const type = parseType(sp.type);
  const status = parseStatus(sp.status);
  const tagId = parsePositiveInt(sp.tag);
  const page = parsePositiveInt(sp.page) ?? 1;

  const [result, allTags] = await Promise.all([
    listWorks({ q, type, status, tagId, page }),
    listAllTags(),
  ]);

  // 是否存在任意筛选(决定空状态文案与是否提供「清除筛选」)。
  const hasFilters =
    q !== undefined ||
    type !== undefined ||
    status !== undefined ||
    tagId !== undefined;

  // 分页:基于当前 query 生成「上一页 / 下一页」链接(保留其它筛选参数)。
  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (tagId !== undefined) params.set("tag", String(tagId));
    if (targetPage > 1) params.set("page", String(targetPage));
    const queryString = params.toString();
    return queryString ? `/works?${queryString}` : "/works";
  };

  const hasPrev = result.page > 1;
  const hasNext = result.pageCount > 0 && result.page < result.pageCount;

  return (
    <>
      <PageHeader
        title="作品"
        description="论文、评论、草稿与其他文稿。"
        action={
          <Button asChild size="sm">
            <Link href="/works/new">
              <Plus />
              新建作品
            </Link>
          </Button>
        }
      />

      <WorksFilters allTags={allTags} />

      {result.items.length === 0 ? (
        hasFilters ? (
          // 有筛选但无匹配。
          <EmptyState
            icon={SearchX}
            title="无匹配结果"
            description="没有符合当前筛选条件的作品,试试调整或清除筛选。"
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/works">清除筛选</Link>
              </Button>
            }
          />
        ) : (
          // 完全没有作品,引导新建。
          <EmptyState
            icon={FileText}
            title="还没有作品"
            description="新建你的第一篇论文、评论或草稿,开始管理学术成果。"
            action={
              <Button asChild size="sm">
                <Link href="/works/new">
                  <Plus />
                  新建作品
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="space-y-4">
          <WorksList items={result.items} />

          {/* 分页控件:仅在多于一页时显示 */}
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
