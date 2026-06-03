// 导出页 —— Phase 6(server 组件)
//
// 取全部作品、项目(含挂接成果)、整库快照,交给 client 组件做格式化 / 复制 / 下载。
// 依赖实时数据,强制动态渲染。
import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { ExportClient } from "@/components/export/export-client";
import {
  getAllWorksForExport,
  getDatabaseDump,
  getProjectsWithOutputs,
} from "@/db/queries/export";

export const metadata: Metadata = { title: "导出" };

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const [works, projects, dump] = await Promise.all([
    getAllWorksForExport(),
    getProjectsWithOutputs(),
    getDatabaseDump(),
  ]);

  return (
    <>
      <PageHeader
        title="导出"
        description="成果清单、项目结题成果列表,以及整库 JSON 备份。"
      />
      <ExportClient works={works} projects={projects} dump={dump} />
    </>
  );
}
