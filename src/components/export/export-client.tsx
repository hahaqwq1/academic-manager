"use client";

// 导出交互 —— Phase 6(client)
//
// 三块:
//   1. 成果清单:按「年份 / 类型」分组 × 「Markdown / 纯文本」格式,实时预览 + 一键复制。
//   2. 项目结题成果列表:选一个项目 → 输出其挂接成果的清单,可复制。
//   3. 整库备份:把六张表导出为 JSON 文件下载。
// 所有格式化在 client 端对 server 传入的数据进行;复制用 navigator.clipboard,下载用 Blob。
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, RotateCcw, Upload } from "lucide-react";
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
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { importDatabase } from "@/lib/actions/export";
import type { Work } from "@/db/schema";
import type {
  DatabaseDump,
  ProjectWithOutputsExport,
} from "@/db/queries/export";
import { WORK_TYPES, WORK_TYPE_LABELS, type WorkType } from "@/lib/constants";

const NO_YEAR = "未注明年份";

function yearOf(publishedAt: string | null): string {
  if (!publishedAt) return NO_YEAR;
  const m = /^(\d{4})-\d{2}-\d{2}$/.exec(publishedAt.trim());
  return m ? `${m[1]}年` : NO_YEAR;
}

function typeLabel(type: string): string {
  return WORK_TYPE_LABELS[type as WorkType] ?? type;
}

// 单条作品的清单行(含年份与否由调用方决定)。
function workLine(w: Work, opts: { withYear: boolean; md: boolean }): string {
  const parts: string[] = [];
  parts.push(typeLabel(w.type));
  if (opts.withYear) {
    const y = yearOf(w.published_at);
    if (y !== NO_YEAR) parts.push(y);
  }
  parts.push(w.status);
  const meta = parts.join("，");
  const authors = w.authors ? `,${w.authors}` : "";
  const bullet = opts.md ? "- " : "  · ";
  const title = opts.md ? `**《${w.title}》**` : `《${w.title}》`;
  return `${bullet}${title}${authors}(${meta})`;
}

// 按分组键归类并保持顺序。
function groupBy<T>(items: T[], keyOf: (t: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const k = keyOf(it);
    const arr = map.get(k);
    if (arr) arr.push(it);
    else map.set(k, [it]);
  }
  return map;
}

// 成果清单:按年份分组(年份倒序,未注明年份置末)。
function formatByYear(works: Work[], md: boolean): string {
  if (works.length === 0) return "(暂无作品)";
  const grouped = groupBy(works, (w) => yearOf(w.published_at));
  const years = [...grouped.keys()].sort((a, b) => {
    if (a === NO_YEAR) return 1;
    if (b === NO_YEAR) return -1;
    return b.localeCompare(a);
  });
  const blocks = years.map((y) => {
    const heading = md ? `### ${y}` : `【${y}】`;
    const lines = grouped
      .get(y)!
      .map((w) => workLine(w, { withYear: false, md }))
      .join("\n");
    return `${heading}\n${lines}`;
  });
  const title = md ? "# 成果清单(按年份)\n" : "成果清单(按年份)\n";
  return `${title}\n${blocks.join("\n\n")}`;
}

// 成果清单:按类型分组(按 WORK_TYPES 固定顺序)。
function formatByType(works: Work[], md: boolean): string {
  if (works.length === 0) return "(暂无作品)";
  const grouped = groupBy(works, (w) => w.type);
  const blocks = WORK_TYPES.filter((t) => grouped.has(t)).map((t) => {
    const heading = md ? `### ${WORK_TYPE_LABELS[t]}` : `【${WORK_TYPE_LABELS[t]}】`;
    const lines = grouped
      .get(t)!
      .map((w) => workLine(w, { withYear: true, md }))
      .join("\n");
    return `${heading}\n${lines}`;
  });
  const title = md ? "# 成果清单(按类型)\n" : "成果清单(按类型)\n";
  return `${title}\n${blocks.join("\n\n")}`;
}

// 项目结题成果列表。
function formatProject(p: ProjectWithOutputsExport, md: boolean): string {
  const headLines = md
    ? [
        `# ${p.title}`,
        ``,
        `- 级别:${p.level} ｜ 角色:${p.role} ｜ 状态:${p.status}${
          p.grant_no ? ` ｜ 编号:${p.grant_no}` : ""
        }`,
        ``,
        `## 产出成果(${p.outputs.length})`,
      ]
    : [
        `${p.title}`,
        `级别:${p.level}  角色:${p.role}  状态:${p.status}${
          p.grant_no ? `  编号:${p.grant_no}` : ""
        }`,
        ``,
        `产出成果(${p.outputs.length}):`,
      ];

  const outputLines =
    p.outputs.length === 0
      ? [md ? "- (暂无挂接成果)" : "  · (暂无挂接成果)"]
      : p.outputs.map((o, i) => {
          const y = yearOf(o.published_at);
          const meta = [typeLabel(o.type), y !== NO_YEAR ? y : null, o.status]
            .filter(Boolean)
            .join("，");
          const authors = o.authors ? `,${o.authors}` : "";
          const title = md ? `**《${o.title}》**` : `《${o.title}》`;
          const prefix = md ? `${i + 1}. ` : `  ${i + 1}. `;
          return `${prefix}${title}${authors}(${meta})`;
        });

  return [...headLines, ...outputLines].join("\n");
}

// 复制按钮:把给定文本写入剪贴板。
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败,请手动选择文本复制");
    }
  };
  return (
    <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
      {copied ? <Check /> : <Copy />}
      {copied ? "已复制" : "复制"}
    </Button>
  );
}

interface ExportClientProps {
  works: Work[];
  projects: ProjectWithOutputsExport[];
  dump: DatabaseDump;
}

export function ExportClient({ works, projects, dump }: ExportClientProps) {
  const [groupBy_, setGroupBy] = useState<"year" | "type">("year");
  const [format, setFormat] = useState<"md" | "text">("md");
  const md = format === "md";

  const worksText = useMemo(
    () => (groupBy_ === "year" ? formatByYear(works, md) : formatByType(works, md)),
    [works, groupBy_, md]
  );

  const [projectId, setProjectId] = useState<string | undefined>(
    projects.length > 0 ? String(projects[0].id) : undefined
  );
  const [projFormat, setProjFormat] = useState<"md" | "text">("md");
  const selectedProject = projects.find((p) => String(p.id) === projectId);
  const projectText = selectedProject
    ? formatProject(selectedProject, projFormat === "md")
    : "";

  const handleDownloadJson = () => {
    const payload = {
      app: "academic-manager",
      exportedAt: new Date().toISOString(),
      data: dump,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `academic-manager-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("已开始下载备份文件");
  };

  // --- 导入 / 恢复 ---
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    payload: unknown;
    summary: string;
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 允许再次选择同一文件:用完即清空 input 值。
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;
    // 大小上限:避免超大文件 JSON.parse 阻塞主线程 / 撑爆内存。
    if (file.size > 50 * 1024 * 1024) {
      toast.error("备份文件过大(上限 50MB)");
      return;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      toast.error("无法解析该文件,请选择有效的 JSON 备份");
      return;
    }
    // 解析后即结构自检:六张表都在且是数组,才允许进入「覆盖」确认,
    // 否则别让用户在错文件上点下不可撤销的按钮(服务端仍会再校验一遍)。
    const d =
      payload && typeof payload === "object" && "data" in payload
        ? (payload as { data: unknown }).data
        : payload;
    const TABLES = [
      "works",
      "projects",
      "submissions",
      "tags",
      "entity_tags",
      "project_outputs",
    ] as const;
    const rec =
      d && typeof d === "object" ? (d as Record<string, unknown>) : null;
    if (!rec || TABLES.some((k) => !Array.isArray(rec[k]))) {
      toast.error("备份结构不完整:缺少必要的数据表");
      return;
    }
    const len = (k: string) => (rec[k] as unknown[]).length;
    const summary = `作品 ${len("works")} · 项目 ${len("projects")} · 投稿 ${len(
      "submissions"
    )} · 标签 ${len("tags")} · 关联 ${len("entity_tags") + len("project_outputs")}`;
    setPendingImport({ fileName: file.name, payload, summary });
  };

  const handleImport = async () => {
    if (!pendingImport) return;
    const res = await importDatabase(pendingImport.payload);
    if (res.ok) {
      toast.success(res.message ?? "已从备份恢复");
      setPendingImport(null);
      router.refresh();
    } else {
      toast.error(res.message ?? "导入失败,请检查备份文件");
      // 失败即清空选择,避免停留在「已选择…」的半残状态;需重试请重新选文件。
      setPendingImport(null);
    }
  };

  const dumpCount =
    dump.works.length +
    dump.projects.length +
    dump.submissions.length +
    dump.tags.length;

  return (
    <div className="space-y-6">
      {/* 1. 成果清单 */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">成果清单</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={groupBy_} onValueChange={(v) => setGroupBy(v as "year" | "type")}>
                <SelectTrigger className="w-32" aria-label="分组方式">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">按年份</SelectItem>
                  <SelectItem value="type">按类型</SelectItem>
                </SelectContent>
              </Select>
              <Select value={format} onValueChange={(v) => setFormat(v as "md" | "text")}>
                <SelectTrigger className="w-36" aria-label="导出格式">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="md">Markdown</SelectItem>
                  <SelectItem value="text">纯文本</SelectItem>
                </SelectContent>
              </Select>
              <CopyButton text={worksText} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            readOnly
            value={worksText}
            className="min-h-64 font-mono text-xs"
            aria-label="成果清单预览"
          />
        </CardContent>
      </Card>

      {/* 2. 项目结题成果列表 */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              项目结题成果列表
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-56" aria-label="选择项目">
                  <SelectValue placeholder="选择一个项目…" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={projFormat}
                onValueChange={(v) => setProjFormat(v as "md" | "text")}
              >
                <SelectTrigger className="w-36" aria-label="导出格式">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="md">Markdown</SelectItem>
                  <SelectItem value="text">纯文本</SelectItem>
                </SelectContent>
              </Select>
              <CopyButton text={projectText} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              还没有项目。先到「项目」新建并挂接成果。
            </p>
          ) : (
            <Textarea
              readOnly
              value={projectText}
              className="min-h-48 font-mono text-xs"
              aria-label="项目成果清单预览"
            />
          )}
        </CardContent>
      </Card>

      {/* 3. 整库 JSON 备份 / 恢复 */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-foreground">整库备份与恢复</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 导出下载 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              将全部数据(作品 {dump.works.length} · 项目 {dump.projects.length} · 投稿{" "}
              {dump.submissions.length} · 标签 {dump.tags.length},共 {dumpCount}{" "}
              条主记录)导出为 JSON 文件,作为复制 app.db 之外的二级备份。
            </p>
            <Button type="button" onClick={handleDownloadJson}>
              <Download />
              下载 JSON 备份
            </Button>
          </div>

          {/* 导入恢复 */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">从备份恢复</p>
              <p className="text-xs text-muted-foreground">
                选择此前导出的 JSON 备份回灌。
                <span className="text-destructive">
                  会清空并覆盖当前全部数据,不可撤销。
                </span>
              </p>
              {pendingImport ? (
                <p className="text-xs text-muted-foreground">
                  已选择:
                  <span className="font-medium text-foreground">
                    {pendingImport.fileName}
                  </span>
                  ({pendingImport.summary})
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFileChange}
                aria-hidden
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload />
                选择备份文件…
              </Button>
              {pendingImport ? (
                <ConfirmDialog
                  destructive
                  title="导入并覆盖全部数据?"
                  description={`将用「${pendingImport.fileName}」(${pendingImport.summary})覆盖当前数据库。此操作会清空现有全部记录且不可撤销,确定继续吗?`}
                  confirmText="覆盖并恢复"
                  onConfirm={handleImport}
                  trigger={
                    <Button type="button" variant="destructive">
                      <RotateCcw />
                      导入并覆盖
                    </Button>
                  }
                />
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
