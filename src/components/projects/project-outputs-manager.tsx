"use client";

// 项目成果挂接管理 —— Phase 3(详情页内)
//
// 展示项目已挂接的成果(作品),并提供:
//   - 从「尚未挂接的作品」下拉中选择一篇 → linkProjectOutput 挂接;
//   - 每条已挂接成果右侧的取消挂接按钮 → unlinkProjectOutput。
// 动作完成后 router.refresh() 让 server 组件回流最新数据(可挂接列表随之更新)。
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { WorkStatusBadge, WorkTypeBadge } from "@/components/works/work-badges";
import { linkProjectOutput, unlinkProjectOutput } from "@/lib/actions/projects";
import type { WorkBrief } from "@/db/queries/works";

interface ProjectOutputsManagerProps {
  projectId: number;
  outputs: WorkBrief[];
  allWorks: WorkBrief[];
}

export function ProjectOutputsManager({
  projectId,
  outputs,
  allWorks,
}: ProjectOutputsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  const linkedIds = new Set(outputs.map((w) => w.id));
  const available = allWorks.filter((w) => !linkedIds.has(w.id));

  const handleLink = (workId: number) => {
    setPickerOpen(false);
    startTransition(async () => {
      const res = await linkProjectOutput(projectId, workId);
      if (res.ok) {
        toast.success("已挂接成果");
        router.refresh();
      } else {
        toast.error(res.message ?? "挂接失败,请重试");
      }
    });
  };

  const handleUnlink = (workId: number, title: string) => {
    startTransition(async () => {
      const res = await unlinkProjectOutput(projectId, workId);
      if (res.ok) {
        toast.success(`已取消挂接「${title}」`);
        router.refresh();
      } else {
        toast.error(res.message ?? "取消挂接失败,请重试");
      }
    });
  };

  return (
    <div className="space-y-3" aria-busy={isPending}>
      {/* 挂接选择器(可搜索 Combobox,作品多时仍可用) */}
      <div className="flex items-center gap-2">
        {available.length > 0 ? (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={pickerOpen}
                aria-label="挂接一篇作品"
                disabled={isPending}
                className="w-full justify-between font-normal text-muted-foreground sm:w-80"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="size-4" />
                  挂接一篇作品…
                </span>
                <ChevronsUpDown className="size-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-(--radix-popover-trigger-width) p-0"
            >
              <Command>
                <CommandInput placeholder="搜索作品标题…" />
                <CommandList>
                  <CommandEmpty>未找到匹配的作品。</CommandEmpty>
                  <CommandGroup>
                    {available.map((work) => (
                      <CommandItem
                        key={work.id}
                        value={work.title}
                        onSelect={() => handleLink(work.id)}
                      >
                        <span className="truncate">{work.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <p className="text-xs text-muted-foreground">
            {allWorks.length === 0
              ? "还没有任何作品可挂接,先去「作品」新建。"
              : "全部作品均已挂接到本项目。"}
          </p>
        )}
      </div>

      {/* 已挂接成果列表 */}
      {outputs.length === 0 ? (
        <p className="text-sm text-muted-foreground">尚未挂接任何成果。</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg ring-1 ring-foreground/10">
          {outputs.map((work) => (
            <li
              key={work.id}
              className="flex items-center gap-3 bg-card px-3 py-2.5"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Link
                  href={`/works/${work.id}`}
                  className="truncate rounded-sm text-sm font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {work.title}
                </Link>
                <WorkTypeBadge type={work.type} />
                <WorkStatusBadge status={work.status} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => handleUnlink(work.id, work.title)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`取消挂接 ${work.title}`}
              >
                <X />
                取消挂接
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
