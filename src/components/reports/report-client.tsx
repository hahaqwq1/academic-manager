"use client";

// 年度报告交互 —— v0.4(client)
//
// 年份下拉(切换走 URL ?year=)+ Markdown 预览(只读 Textarea)+ 一键复制。
// 复制用 navigator.clipboard;Markdown 由 buildReportMarkdown 纯函数生成。
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AnnualReport } from "@/db/queries/annual-report";
import { buildReportMarkdown } from "@/lib/report-markdown";

export function ReportClient({
  report,
  years,
  year,
}: {
  report: AnnualReport;
  years: number[];
  year: number;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const markdown = buildReportMarkdown(report);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast.success("已复制 Markdown 到剪贴板");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败,请手动选择文本复制");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <Select
          value={String(year)}
          onValueChange={(v) => router.push(`/reports?year=${v}`)}
        >
          <SelectTrigger className="w-32" aria-label="选择年份">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y} 年
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          复制 Markdown
        </Button>
      </CardHeader>
      <CardContent>
        <Textarea
          readOnly
          value={markdown}
          aria-label={`${year} 年度报告 Markdown`}
          className="h-[28rem] font-mono text-xs"
        />
      </CardContent>
    </Card>
  );
}
