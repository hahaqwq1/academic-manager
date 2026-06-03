// 年度报告页 —— v0.4(server 组件)
//
// 取可选年份(getReportYears)+ 指定年份的结构化报告(getAnnualReport),
// 交 ReportClient 渲染年份下拉 + Markdown 预览 + 复制。
// 年份取 URL ?year=,非法 / 越界则回退到最近年份。空库渲染空态。
// 依赖实时数据,强制动态渲染。
import type { Metadata } from "next";

import { CalendarDays } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ReportClient } from "@/components/reports/report-client";
import { getAnnualReport, getReportYears } from "@/db/queries/annual-report";

export const metadata: Metadata = { title: "年度报告" };

export const dynamic = "force-dynamic";

interface ReportsPageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const years = await getReportYears();
  const sp = await searchParams;

  if (years.length === 0) {
    return (
      <>
        <PageHeader
          title="年度报告"
          description="按年份汇总发表、投稿、立项与结题,一键生成述职材料。"
        />
        <EmptyState
          icon={CalendarDays}
          title="暂无可生成报告的数据"
          description="先录入带发表日期的成果、投稿记录或带日期的项目,这里就能按年份生成报告。"
        />
      </>
    );
  }

  const requested = Number(sp.year);
  const year = years.includes(requested) ? requested : years[0]!;
  const report = await getAnnualReport(year);

  return (
    <>
      <PageHeader
        title="年度报告"
        description="按年份汇总发表、投稿、立项与结题,可复制 Markdown 粘贴进 Word / 述职材料。"
      />
      <ReportClient report={report} years={years} year={year} />
    </>
  );
}
