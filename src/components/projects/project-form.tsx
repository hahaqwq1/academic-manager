"use client";

// 项目表单 —— Phase 3 共享 UI(新建 / 编辑复用)
//
// 受控字段(React 19 原生,不用 react-hook-form):
//   - level / role / status 用 shadcn Select(受控 Radix,值放 state,均必填);
//   - title / grant_no / funding 用 Input;start_date / end_date 用 date Input;
//   - notes 用 Textarea;标签用可点击切换的 Badge 维护 selectedTagIds。
// 提交:阻止默认,startTransition 调用作为 prop 传入的 server action(传纯对象,不用 FormData);
// 若 !res.ok,按 res.errors 在各字段下显示行内中文错误,并 toast.error(res.message)。
// 成功时 action 自身 redirect,无需在此处理。
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

import {
  PROJECT_LEVELS,
  PROJECT_ROLES,
  PROJECT_STATUSES,
  type ProjectLevel,
  type ProjectRole,
  type ProjectStatus,
} from "@/lib/constants";
import type { ProjectInput } from "@/lib/validations";
import type { ProjectActionState } from "@/lib/actions/projects";
import type { Project, Tag } from "@/db/schema";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ProjectFormProps {
  action: (input: ProjectInput) => Promise<ProjectActionState>;
  allTags: Tag[];
  defaultValues?: Partial<Project> & { tagIds?: number[] };
  submitText?: string;
  cancelHref?: string;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  );
}

function RequiredMark() {
  return <span className="text-destructive">*</span>;
}

export function ProjectForm({
  action,
  allTags,
  defaultValues,
  submitText = "保存",
  cancelHref = "/projects",
}: ProjectFormProps) {
  const [title, setTitle] = useState<string>(defaultValues?.title ?? "");
  const [level, setLevel] = useState<ProjectLevel>(
    defaultValues?.level ?? "校级",
  );
  const [role, setRole] = useState<ProjectRole>(
    defaultValues?.role ?? "主持",
  );
  const [status, setStatus] = useState<ProjectStatus>(
    defaultValues?.status ?? "拟申报",
  );
  const [grantNo, setGrantNo] = useState<string>(defaultValues?.grant_no ?? "");
  const [funding, setFunding] = useState<string>(defaultValues?.funding ?? "");
  const [startDate, setStartDate] = useState<string>(
    defaultValues?.start_date ?? "",
  );
  const [endDate, setEndDate] = useState<string>(defaultValues?.end_date ?? "");
  const [notes, setNotes] = useState<string>(defaultValues?.notes ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    defaultValues?.tagIds ?? [],
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values: ProjectInput = {
      title,
      level,
      role,
      status,
      grant_no: grantNo === "" ? null : grantNo,
      funding: funding === "" ? null : funding,
      start_date: startDate === "" ? null : startDate,
      end_date: endDate === "" ? null : endDate,
      notes: notes === "" ? null : notes,
      tagIds: selectedTagIds,
    };

    startTransition(async () => {
      const res = await action(values);
      if (!res.ok) {
        setErrors(res.errors ?? {});
        if (res.message) toast.error(res.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* 项目名称(必填,占满整行) */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="project-title">
              项目名称 <RequiredMark />
            </Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="项目 / 课题名称"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? "project-title-error" : undefined}
            />
            <FieldError id="project-title-error" message={errors.title} />
          </div>

          {/* 级别(必填) */}
          <div className="space-y-2">
            <Label htmlFor="project-level">
              级别 <RequiredMark />
            </Label>
            <Select value={level} onValueChange={(v) => setLevel(v as ProjectLevel)}>
              <SelectTrigger id="project-level" className="w-full">
                <SelectValue placeholder="选择级别" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="project-level-error" message={errors.level} />
          </div>

          {/* 角色(必填) */}
          <div className="space-y-2">
            <Label htmlFor="project-role">
              角色 <RequiredMark />
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as ProjectRole)}>
              <SelectTrigger id="project-role" className="w-full">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="project-role-error" message={errors.role} />
          </div>

          {/* 状态(必填) */}
          <div className="space-y-2">
            <Label htmlFor="project-status">
              状态 <RequiredMark />
            </Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ProjectStatus)}
            >
              <SelectTrigger id="project-status" className="w-full">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="project-status-error" message={errors.status} />
          </div>

          {/* 立项编号 */}
          <div className="space-y-2">
            <Label htmlFor="project-grant-no">立项编号</Label>
            <Input
              id="project-grant-no"
              value={grantNo}
              onChange={(e) => setGrantNo(e.target.value)}
              placeholder="如:23BJL001"
            />
            <FieldError id="project-grant-no-error" message={errors.grant_no} />
          </div>

          {/* 经费 */}
          <div className="space-y-2">
            <Label htmlFor="project-funding">经费</Label>
            <Input
              id="project-funding"
              value={funding}
              onChange={(e) => setFunding(e.target.value)}
              placeholder="如:20万元"
            />
            <FieldError id="project-funding-error" message={errors.funding} />
          </div>

          {/* 起始日期 */}
          <div className="space-y-2">
            <Label htmlFor="project-start-date">起始日期</Label>
            <Input
              id="project-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-invalid={errors.start_date ? true : undefined}
            />
            <FieldError id="project-start-date-error" message={errors.start_date} />
          </div>

          {/* 结束日期 */}
          <div className="space-y-2">
            <Label htmlFor="project-end-date">结束日期</Label>
            <Input
              id="project-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-invalid={errors.end_date ? true : undefined}
            />
            <FieldError id="project-end-date-error" message={errors.end_date} />
          </div>

          {/* 备注(占满整行) */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="project-notes">备注</Label>
            <Textarea
              id="project-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="备注信息"
              className="min-h-24"
            />
            <FieldError id="project-notes-error" message={errors.notes} />
          </div>

          {/* 标签(占满整行,可点击切换) */}
          <div className="space-y-2 sm:col-span-2">
            <Label>标签</Label>
            {allTags.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                暂无标签,可在标签管理中创建。
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      aria-pressed={active}
                      className="rounded-4xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <Badge
                        variant={active ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          !active && "hover:bg-muted",
                        )}
                      >
                        {tag.name}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
            <FieldError id="project-tag-ids-error" message={errors.tagIds} />
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button variant="outline" asChild disabled={isPending}>
            <Link href={cancelHref}>取消</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "提交中…" : submitText}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
