// 作品详情页 —— Phase 2 [N]
//
// server 组件:await params 取 id;getWorkById 为空则 notFound()。
// 用 Card 渲染标题、徽标、字段(空值显示「—」,日期用 formatDate/formatDateTime)与标签;
// 操作区提供编辑(链接)与删除(client 组件 DeleteWorkButton)。
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { getWorkById } from "@/db/queries/works";
import { listSubmissionsForWork } from "@/db/queries/submissions";
import { WorkSubmissionsManager } from "@/components/submissions/work-submissions-manager";
import { formatDate, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import {
  EMPTY,
  displayValue as display,
  DetailField as Field,
  DetailBlockField as BlockField,
} from "@/components/common/detail-fields";
import { WorkStatusBadge, WorkTypeBadge } from "@/components/works/work-badges";
import { DeleteWorkButton } from "@/components/works/delete-work-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const work = await getWorkById(Number(id));
  return { title: work ? work.title : "作品详情" };
}

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workId = Number(id);
  const [work, submissions] = await Promise.all([
    getWorkById(workId),
    listSubmissionsForWork(workId),
  ]);
  if (!work) notFound();

  return (
    <>
      <PageHeader
        title={work.title}
        description="作品详情"
        action={
          <Button variant="outline" asChild>
            <Link href="/works">
              <ArrowLeft />
              返回列表
            </Link>
          </Button>
        }
      />

      <Card>
        {/* 标题已由页眉(PageHeader)承载,卡片头仅呈现类型 / 状态徽标,避免标题重复 */}
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <WorkTypeBadge type={work.type} />
            <WorkStatusBadge status={work.status} />
          </div>
        </CardHeader>

        <CardContent>
          <dl className="divide-y divide-border">
            <Field
              label="作者"
              value={display(work.authors)}
              empty={display(work.authors) === EMPTY}
            />
            <Field
              label="署名角色"
              value={display(work.author_role)}
              empty={display(work.author_role) === EMPTY}
            />
            <Field
              label="字数"
              value={
                work.word_count != null
                  ? work.word_count.toLocaleString("zh-CN")
                  : EMPTY
              }
              empty={work.word_count == null}
            />
            <Field
              label="发表日期"
              value={formatDate(work.published_at)}
              empty={!work.published_at}
            />
            <Field
              label="发表期刊"
              value={display(work.journal)}
              empty={display(work.journal) === EMPTY}
            />
            <Field
              label="DOI"
              value={
                work.doi && work.doi.trim() !== "" ? (
                  <a
                    href={`https://doi.org/${work.doi.trim()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-mono text-xs text-primary hover:underline"
                  >
                    {work.doi.trim()}
                  </a>
                ) : (
                  EMPTY
                )
              }
              empty={!work.doi || work.doi.trim() === ""}
            />
            <Field
              label="文件路径"
              value={
                work.file_path && work.file_path.trim() !== "" ? (
                  <span className="break-all font-mono text-xs">
                    {work.file_path.trim()}
                  </span>
                ) : (
                  EMPTY
                )
              }
              empty={!work.file_path || work.file_path.trim() === ""}
            />
          </dl>

          <Separator className="my-2" />

          <BlockField label="摘要" value={work.summary} />
          <BlockField label="备注" value={work.notes} />

          <Separator className="my-2" />

          <div className="space-y-1.5 py-2 text-sm">
            <p className="text-muted-foreground">标签</p>
            {work.tags.length === 0 ? (
              <p className="text-muted-foreground">{EMPTY}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {work.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-2" />

          {/* 投稿记录管理(Phase 4) */}
          <div className="py-2">
            <WorkSubmissionsManager
              workId={work.id}
              submissions={submissions}
            />
          </div>

          <Separator className="my-2" />

          <dl className="divide-y divide-border">
            <Field label="创建时间" value={formatDateTime(work.created_at)} />
            <Field label="更新时间" value={formatDateTime(work.updated_at)} />
          </dl>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <DeleteWorkButton id={work.id} title={work.title} />
          <Button asChild>
            <Link href={`/works/${work.id}/edit`}>
              <Pencil />
              编辑
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
