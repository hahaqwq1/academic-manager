// 新建项目页 —— Phase 3(server 组件)
//
// 取全部标签供表单选择,渲染 ProjectForm 并传入 createProject action。
// 提交成功后 createProject 自身 redirect 到新项目详情页。
import type { Metadata } from "next";
import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { Button } from "@/components/ui/button";
import { listAllTags } from "@/db/queries/tags";
import { createProject } from "@/lib/actions/projects";

export const metadata: Metadata = { title: "新建项目" };

// 强制动态渲染:表单标签芯片来自 listAllTags(),需始终反映最新标签数据。
export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const tags = await listAllTags();

  return (
    <>
      <PageHeader
        title="新建项目"
        description="录入一个课题 / 项目的基本信息。"
        action={
          <Button variant="outline" asChild>
            <Link href="/projects">
              <ArrowLeft />
              返回列表
            </Link>
          </Button>
        }
      />
      <ProjectForm action={createProject} allTags={tags} submitText="创建" />
    </>
  );
}
