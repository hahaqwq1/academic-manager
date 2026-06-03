"use client";

// 标签管理 —— Phase 4
//
// 顶部新建标签(输入 + 添加);下方标签列表,每个标签:
//   - 名称(链接 ?tag=id 进入按主题浏览)+ 引用计数;
//   - 重命名(对话框)/ 删除(二次确认,提示将解除全部关联)。
// 所有动作完成后 router.refresh() 反映最新数据。
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Pencil, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TagWithCounts } from "@/db/queries/tags";
import { createTag, deleteTag, renameTag } from "@/lib/actions/tags";
import { cn } from "@/lib/utils";

interface TagsManagerProps {
  tags: TagWithCounts[];
  activeTagId?: number;
}

// 重命名对话框(自管开合)。
function RenameTagDialog({
  id,
  currentName,
}: {
  id: number;
  currentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const res = await renameTag(id, name);
      if (res.ok) {
        toast.success("已重命名标签");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.message ?? "重命名失败");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setName(currentName);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`重命名 ${currentName}`}>
          <Pencil />
          重命名
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>重命名标签</DialogTitle>
          <DialogDescription>
            修改标签名称;已打在作品 / 项目上的关联会一并沿用新名称。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rename-tag">标签名称</Label>
            <Input
              id="rename-tag"
              value={name}
              onChange={(e) => setName(e.target.value)}
              // 对话框由用户主动打开,自动聚焦重命名输入框是符合无障碍预期的焦点转移(非页面加载抢焦点)。
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TagsManager({ tags, activeTagId }: TagsManagerProps) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newName.trim();
    if (name === "") return;
    startTransition(async () => {
      const res = await createTag(name);
      if (res.ok) {
        toast.success(`已创建标签「${name}」`);
        setNewName("");
        router.refresh();
      } else {
        toast.error(res.message ?? "创建失败");
      }
    });
  };

  const handleDelete = (id: number, name: string) => {
    startTransition(async () => {
      const res = await deleteTag(id);
      if (res.ok) {
        toast.success(`已删除标签「${name}」`);
        router.refresh();
      } else {
        toast.error(res.message ?? "删除失败");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* 新建标签 */}
      <form onSubmit={handleCreate} className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新建标签名称…"
          className="w-full sm:w-64"
          aria-label="新建标签名称"
        />
        <Button type="submit" disabled={isPending || newName.trim() === ""}>
          <Plus />
          添加
        </Button>
      </form>

      {/* 标签列表 */}
      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          还没有标签。在上方输入名称即可创建第一个主题标签。
        </p>
      ) : (
        <ul
          className="divide-y divide-border overflow-hidden rounded-xl ring-1 ring-foreground/10"
          aria-busy={isPending}
        >
          {tags.map((tag) => (
            <li
              key={tag.id}
              className={cn(
                "flex items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-muted/40",
                activeTagId === tag.id && "bg-primary/5",
              )}
            >
              <Link
                href={`/tags?tag=${tag.id}`}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <TagIcon className="size-4 shrink-0 text-muted-foreground" />
                <span
                  className={cn(
                    "truncate text-sm font-medium",
                    activeTagId === tag.id ? "text-primary" : "text-foreground",
                  )}
                >
                  {tag.name}
                </span>
                <Badge
                  variant="outline"
                  className="font-normal text-muted-foreground"
                >
                  作品 {tag.workCount} · 项目 {tag.projectCount}
                </Badge>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                <RenameTagDialog id={tag.id} currentName={tag.name} />
                <ConfirmDialog
                  destructive
                  title="删除标签"
                  description={`确定删除标签「${tag.name}」吗?该标签与全部作品 / 项目的关联将一并解除(不影响作品 / 项目本身)。`}
                  confirmText="删除"
                  onConfirm={() => handleDelete(tag.id, tag.name)}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`删除 ${tag.name}`}
                    >
                      <Trash2 />
                      删除
                    </Button>
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
