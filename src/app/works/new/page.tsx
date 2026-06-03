// 新建作品页 —— Phase 2 [M]
//
// server 组件:取全部标签供表单选择,渲染 WorkForm 并传入 createWork action。
// 提交成功后 createWork 自身 redirect 到新作品详情页。
import type { Metadata } from "next";
import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { WorkForm } from "@/components/works/work-form";
import { listAllTags } from "@/db/queries/tags";
import { createWork } from "@/lib/actions/works";

export const metadata: Metadata = { title: "新建作品" };

// 强制动态渲染:表单的标签芯片来自 listAllTags(),需始终反映最新标签数据。
// 否则 Next 16 会把本页判定为静态,把构建期的标签列表烘焙进页面,
// 后续在标签管理中增删标签后此表单不会更新(无处 revalidatePath("/works/new"))。
export const dynamic = "force-dynamic";

export default async function NewWorkPage() {
  const tags = await listAllTags();

  return (
    <>
      <PageHeader
        title="新建作品"
        description="录入一篇论文、评论、草稿或其他文稿。"
        action={
          <Button variant="outline" asChild>
            <Link href="/works">
              <ArrowLeft />
              返回列表
            </Link>
          </Button>
        }
      />
      <WorkForm action={createWork} allTags={tags} submitText="创建" />
    </>
  );
}
