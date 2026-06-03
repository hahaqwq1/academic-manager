"use client";

// 文件路径操作 —— v1.0(client)
//
// 作品详情页的 file_path 旁:复制路径(剪贴板)+ 打开文件 / 所在文件夹(server action 调系统命令)。
// 「本地优先」的天然红利:一键打开本机论文 / 审稿意见,免去手敲长路径。
import { useState, useTransition } from "react";

import { Check, Copy, ExternalLink, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { openLocalFile } from "@/lib/actions/open-file";
import type { OpenMode } from "@/lib/open-command";

export function FilePathActions({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
      toast.success("已复制路径");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败,请手动选择复制");
    }
  }

  function run(mode: OpenMode) {
    startTransition(async () => {
      const r = await openLocalFile(path, mode);
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    });
  }

  return (
    <div className="space-y-1.5">
      <span className="block break-all font-mono text-xs">{path}</span>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          复制路径
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run("open")}
        >
          <ExternalLink className="size-3.5" />
          打开文件
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run("reveal")}
        >
          <FolderOpen className="size-3.5" />
          所在文件夹
        </Button>
      </div>
    </div>
  );
}
