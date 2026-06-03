// 编辑项目页 —— Phase 3(server 组件)
//
// await params 取 id;getProjectById 为空则 notFound()。
// defaultValues 由项目各字段 + 现有标签 id 列表构成;action 用 updateProject.bind(null, id)
// 预绑定 id,使表单仍以单参(input)调用契约不变。保存成功后 updateProject 自身 redirect。
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getProjectById } from "@/db/queries/projects";
import { listAllTags } from "@/db/queries/tags";
import { updateProject } from "@/lib/actions/projects";
import { PageHeader } from "@/components/common/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "编辑项目" };

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);
  const [project, tags] = await Promise.all([
    getProjectById(projectId),
    listAllTags(),
  ]);
  if (!project) notFound();

  const defaultValues = {
    title: project.title,
    level: project.level,
    role: project.role,
    status: project.status,
    grant_no: project.grant_no,
    funding: project.funding,
    funding_amount: project.funding_amount,
    funding_currency: project.funding_currency,
    start_date: project.start_date,
    end_date: project.end_date,
    notes: project.notes,
    tagIds: project.tags.map((tag) => tag.id),
  };

  return (
    <>
      <PageHeader
        title="编辑项目"
        description={project.title}
        action={
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}`}>
              <ArrowLeft />
              返回详情
            </Link>
          </Button>
        }
      />
      <ProjectForm
        action={updateProject.bind(null, projectId)}
        allTags={tags}
        defaultValues={defaultValues}
        submitText="保存"
        cancelHref={`/projects/${projectId}`}
      />
    </>
  );
}
