// 导出页 —— Phase 6(server 组件)
//
// 取全部作品、项目(含挂接成果)、整库快照,交给 client 组件做格式化 / 复制 / 下载。
// 依赖实时数据,强制动态渲染。
import type { Metadata } from "next";

import { CalendarClock, FileText } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { ExportClient } from "@/components/export/export-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

      <div className="mt-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold">下载文件</h2>
            <p className="text-xs text-muted-foreground">
              成果清单 Word 文档(年度考核 / 职称 / 结题直接可交);以及「投稿超期
              + 项目结题」截止日历 .ics,导入系统日历(Apple / Google /
              Outlook)由其到点提醒。
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/export/docx" download>
                <FileText className="size-4" />
                成果清单(.docx)
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/export/calendar" download>
                <CalendarClock className="size-4" />
                截止日历(.ics)
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
