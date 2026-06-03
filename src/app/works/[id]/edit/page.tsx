// 编辑作品页 —— Phase 2 [O]
//
// server 组件:await params 取 id;getWorkById 为空则 notFound()。
// defaultValues 由作品各字段 + 现有标签 id 列表构成;action 用 updateWork.bind(null, id)
// 预绑定 id,使表单仍以单参(input)调用契约不变。保存成功后 updateWork 自身 redirect。
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { WorkForm } from "@/components/works/work-form";
import { listAllTags } from "@/db/queries/tags";
import { getWorkById } from "@/db/queries/works";
import { updateWork } from "@/lib/actions/works";

export const metadata: Metadata = { title: "编辑作品" };

export default async function EditWorkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workId = Number(id);
  const [work, tags] = await Promise.all([getWorkById(workId), listAllTags()]);
  if (!work) notFound();

  // 表单默认值:作品各列 + 当前已选标签 id 列表。
  const defaultValues = {
    type: work.type,
    title: work.title,
    status: work.status,
    authors: work.authors,
    author_role: work.author_role,
    word_count: work.word_count,
    summary: work.summary,
    notes: work.notes,
    file_path: work.file_path,
    published_at: work.published_at,
    doi: work.doi,
    journal: work.journal,
    tagIds: work.tags.map((tag) => tag.id),
  };

  return (
    <>
      <PageHeader
        title="编辑作品"
        description={work.title}
        action={
          <Button variant="outline" asChild>
            <Link href={`/works/${workId}`}>
              <ArrowLeft />
              返回详情
            </Link>
          </Button>
        }
      />
      <WorkForm
        action={updateWork.bind(null, workId)}
        allTags={tags}
        defaultValues={defaultValues}
        submitText="保存"
        cancelHref={`/works/${workId}`}
      />
    </>
  );
}
