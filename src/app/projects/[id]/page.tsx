// 项目详情页 —— Phase 3(server 组件)
//
// await params 取 id;getProjectById 为空则 notFound()。
// 用 Card 渲染级别/角色/状态徽标、字段(空值显示「—」,日期用 formatDate)与标签;
// 「产出成果」区用 client 组件 ProjectOutputsManager 管理挂接(需全部作品供选择);
// 操作区提供编辑(链接)与删除(client 组件 DeleteProjectButton)。
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { getProjectById } from "@/db/queries/projects";
import { listWorksMinimal } from "@/db/queries/works";
import { formatDate, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import {
  EMPTY,
  displayValue as display,
  DetailField as Field,
  DetailBlockField as BlockField,
} from "@/components/common/detail-fields";
import {
  ProjectLevelBadge,
  ProjectRoleBadge,
  ProjectStatusBadge,
} from "@/components/projects/project-badges";
import { ProjectOutputsManager } from "@/components/projects/project-outputs-manager";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
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
  const project = await getProjectById(Number(id));
  return { title: project ? project.title : "项目详情" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);
  const [project, allWorks] = await Promise.all([
    getProjectById(projectId),
    listWorksMinimal(),
  ]);
  if (!project) notFound();

  // 起止日期区间展示:两端任一存在则拼接,皆空显示占位符。
  const period =
    project.start_date || project.end_date
      ? `${formatDate(project.start_date)} ~ ${formatDate(project.end_date)}`
      : EMPTY;

  return (
    <>
      <PageHeader
        title={project.title}
        description="项目详情"
        action={
          <Button variant="outline" asChild>
            <Link href="/projects">
              <ArrowLeft />
              返回列表
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <ProjectLevelBadge level={project.level} />
            <ProjectStatusBadge status={project.status} />
            <ProjectRoleBadge role={project.role} />
          </div>
        </CardHeader>

        <CardContent>
          <dl className="divide-y divide-border">
            <Field
              label="立项编号"
              value={display(project.grant_no)}
              empty={display(project.grant_no) === EMPTY}
            />
            <Field
              label="经费"
              value={display(project.funding)}
              empty={display(project.funding) === EMPTY}
            />
            <Field label="起止日期" value={period} empty={period === EMPTY} />
          </dl>

          <Separator className="my-2" />

          <BlockField label="备注" value={project.notes} />

          <Separator className="my-2" />

          <div className="space-y-1.5 py-2 text-sm">
            <p className="text-muted-foreground">标签</p>
            {project.tags.length === 0 ? (
              <p className="text-muted-foreground">{EMPTY}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-2" />

          {/* 产出成果挂接 */}
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                产出成果
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  已挂接 {project.outputs.length} 项
                </span>
              </p>
            </div>
            <ProjectOutputsManager
              projectId={project.id}
              outputs={project.outputs}
              allWorks={allWorks}
            />
          </div>

          <Separator className="my-2" />

          <dl className="divide-y divide-border">
            <Field
              label="创建时间"
              value={formatDateTime(project.created_at)}
            />
            <Field
              label="更新时间"
              value={formatDateTime(project.updated_at)}
            />
          </dl>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <DeleteProjectButton id={project.id} title={project.title} />
          <Button asChild>
            <Link href={`/projects/${project.id}/edit`}>
              <Pencil />
              编辑
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
