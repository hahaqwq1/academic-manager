"use client";

// 作品表单 —— Phase 2 共享 UI [H]
//
// 受控字段(React 19 原生,不用 react-hook-form):
//   - type / status / author_role 用 shadcn Select(受控 Radix,值放 state);
//   - title / authors / word_count / file_path / published_at 用 Input;
//   - summary / notes 用 Textarea;
//   - 标签用可点击切换的 Badge 维护 selectedTagIds。
// 提交:阻止默认,startTransition 调用作为 prop 传入的 server action(传纯对象,不用 FormData);
// 若 !res.ok,按 res.errors 在各字段下显示行内中文错误,并 toast.error(res.message)。
// 成功时 action 自身 redirect,无需在此处理。
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

import {
  AUTHOR_ROLES,
  WORK_STATUSES,
  WORK_TYPES,
  WORK_TYPE_LABELS,
  type AuthorRole,
  type WorkStatus,
  type WorkType,
} from "@/lib/constants";
import type { WorkInput } from "@/lib/validations";
import type { WorkActionState } from "@/lib/actions/works";
import type { Tag, Work } from "@/db/schema";
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

interface WorkFormProps {
  action: (input: WorkInput) => Promise<WorkActionState>;
  allTags: Tag[];
  defaultValues?: Partial<Work> & { tagIds?: number[] };
  submitText?: string;
  cancelHref?: string;
}

// 署名角色「未选择」哨兵:Radix Select 不接受空字符串 value,
// 且无内建清除手段,故用此哨兵项让用户把已选角色清空回 null。
const ROLE_NONE = "__none__";

// 行内错误文案:统一红色小字。带 id 以便控件用 aria-describedby 关联,
// 屏幕阅读器聚焦字段时即可朗读对应错误。
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  );
}

// 必填星标。
function RequiredMark() {
  return <span className="text-destructive">*</span>;
}

export function WorkForm({
  action,
  allTags,
  defaultValues,
  submitText = "保存",
  cancelHref = "/works",
}: WorkFormProps) {
  // 受控字段状态。可空文本以空串承载(提交时由 server 端 schema 归一为 null)。
  const [type, setType] = useState<WorkType>(
    (defaultValues?.type as WorkType | undefined) ?? "paper",
  );
  const [title, setTitle] = useState<string>(defaultValues?.title ?? "");
  const [status, setStatus] = useState<WorkStatus>(
    (defaultValues?.status as WorkStatus | undefined) ?? "构思",
  );
  const [authors, setAuthors] = useState<string>(defaultValues?.authors ?? "");
  // author_role:可空枚举。空串表示「未选择」,提交时归一为 null。
  const [authorRole, setAuthorRole] = useState<AuthorRole | "">(
    (defaultValues?.author_role as AuthorRole | null | undefined) ?? "",
  );
  const [wordCount, setWordCount] = useState<string>(
    defaultValues?.word_count != null ? String(defaultValues.word_count) : "",
  );
  const [summary, setSummary] = useState<string>(defaultValues?.summary ?? "");
  const [notes, setNotes] = useState<string>(defaultValues?.notes ?? "");
  const [filePath, setFilePath] = useState<string>(
    defaultValues?.file_path ?? "",
  );
  const [publishedAt, setPublishedAt] = useState<string>(
    defaultValues?.published_at ?? "",
  );
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    defaultValues?.tagIds ?? [],
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // 切换标签选中态。
  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 组装纯对象(不用 FormData)。可空字段以空串 / 原值传入,交由 server schema 归一。
    // word_count:表单 prop 契约为 WorkInput(已 coerce 的输出类型,number | null),
    // 故此处保持 number;空串 → null,非数值(NaN)同样归一为 null 以免把 NaN 传给 server
    // (schema 虽能兜底报错,但 client 不应主动送出 NaN)。
    const parsedWordCount =
      wordCount === "" || Number.isNaN(Number(wordCount))
        ? null
        : Number(wordCount);
    const values: WorkInput = {
      type,
      title,
      status,
      authors: authors === "" ? null : authors,
      author_role: authorRole === "" ? null : authorRole,
      word_count: parsedWordCount,
      summary: summary === "" ? null : summary,
      notes: notes === "" ? null : notes,
      file_path: filePath === "" ? null : filePath,
      published_at: publishedAt === "" ? null : publishedAt,
      tagIds: selectedTagIds,
    };

    startTransition(async () => {
      const res = await action(values);
      if (!res.ok) {
        setErrors(res.errors ?? {});
        if (res.message) toast.error(res.message);
      }
      // 成功时 action 自身 redirect,无需处理。
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* 类型(必填) */}
          <div className="space-y-2">
            <Label htmlFor="work-type">
              类型 <RequiredMark />
            </Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as WorkType)}
            >
              <SelectTrigger
                id="work-type"
                className="w-full"
                aria-invalid={errors.type ? true : undefined}
                aria-describedby={errors.type ? "work-type-error" : undefined}
              >
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                {WORK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {WORK_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="work-type-error" message={errors.type} />
          </div>

          {/* 状态(必填) */}
          <div className="space-y-2">
            <Label htmlFor="work-status">
              状态 <RequiredMark />
            </Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as WorkStatus)}
            >
              <SelectTrigger
                id="work-status"
                className="w-full"
                aria-invalid={errors.status ? true : undefined}
                aria-describedby={errors.status ? "work-status-error" : undefined}
              >
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                {WORK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="work-status-error" message={errors.status} />
          </div>

          {/* 标题(必填,占满整行) */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="work-title">
              标题 <RequiredMark />
            </Label>
            <Input
              id="work-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="作品标题"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? "work-title-error" : undefined}
            />
            <FieldError id="work-title-error" message={errors.title} />
          </div>

          {/* 作者 */}
          <div className="space-y-2">
            <Label htmlFor="work-authors">作者</Label>
            <Input
              id="work-authors"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="如:张三, 李四"
              aria-invalid={errors.authors ? true : undefined}
              aria-describedby={errors.authors ? "work-authors-error" : undefined}
            />
            <FieldError id="work-authors-error" message={errors.authors} />
          </div>

          {/* 署名角色(可空) */}
          <div className="space-y-2">
            <Label htmlFor="work-author-role">署名角色</Label>
            <Select
              value={authorRole === "" ? undefined : authorRole}
              onValueChange={(v) =>
                setAuthorRole(v === ROLE_NONE ? "" : (v as AuthorRole))
              }
            >
              <SelectTrigger
                id="work-author-role"
                className="w-full"
                aria-invalid={errors.author_role ? true : undefined}
                aria-describedby={
                  errors.author_role ? "work-author-role-error" : undefined
                }
              >
                <SelectValue placeholder="选择署名角色" />
              </SelectTrigger>
              <SelectContent>
                {/* 哨兵项:把已选角色清空回「未选择」(提交时归一为 null)。 */}
                <SelectItem value={ROLE_NONE} className="text-muted-foreground">
                  未选择
                </SelectItem>
                {AUTHOR_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError
              id="work-author-role-error"
              message={errors.author_role}
            />
          </div>

          {/* 字数 */}
          <div className="space-y-2">
            <Label htmlFor="work-word-count">字数</Label>
            <Input
              id="work-word-count"
              type="number"
              min={0}
              value={wordCount}
              onChange={(e) => setWordCount(e.target.value)}
              placeholder="如:8000"
              aria-invalid={errors.word_count ? true : undefined}
              aria-describedby={
                errors.word_count ? "work-word-count-error" : undefined
              }
            />
            <FieldError id="work-word-count-error" message={errors.word_count} />
          </div>

          {/* 发表日期 */}
          <div className="space-y-2">
            <Label htmlFor="work-published-at">发表日期</Label>
            <Input
              id="work-published-at"
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              aria-invalid={errors.published_at ? true : undefined}
              aria-describedby={
                errors.published_at ? "work-published-at-error" : undefined
              }
            />
            <FieldError
              id="work-published-at-error"
              message={errors.published_at}
            />
          </div>

          {/* 文件路径(占满整行) */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="work-file-path">文件路径</Label>
            <Input
              id="work-file-path"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="如:D:/papers/2026-xxx.docx"
              aria-invalid={errors.file_path ? true : undefined}
              aria-describedby={
                errors.file_path ? "work-file-path-error" : undefined
              }
            />
            <FieldError id="work-file-path-error" message={errors.file_path} />
          </div>

          {/* 摘要(占满整行) */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="work-summary">摘要</Label>
            <Textarea
              id="work-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="作品摘要"
              className="min-h-24"
              aria-invalid={errors.summary ? true : undefined}
              aria-describedby={errors.summary ? "work-summary-error" : undefined}
            />
            <FieldError id="work-summary-error" message={errors.summary} />
          </div>

          {/* 备注(占满整行) */}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="work-notes">备注</Label>
            <Textarea
              id="work-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="备注信息"
              aria-invalid={errors.notes ? true : undefined}
              aria-describedby={errors.notes ? "work-notes-error" : undefined}
            />
            <FieldError id="work-notes-error" message={errors.notes} />
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
            <FieldError id="work-tag-ids-error" message={errors.tagIds} />
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
