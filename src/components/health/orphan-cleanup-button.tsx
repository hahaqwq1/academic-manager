"use client";

// 孤儿标签关联「一键清理」按钮 —— 升级线(体验层)
//
// 二次确认后调 cleanupOrphanEntityTags,成功 toast + router.refresh 让体检页重算。
import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cleanupOrphanEntityTags } from "@/lib/actions/health";

export function OrphanCleanupButton({ count }: { count: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleCleanup = () => {
    startTransition(async () => {
      const res = await cleanupOrphanEntityTags();
      if (res.ok) {
        toast.success(
          res.deleted > 0
            ? `已清理 ${res.deleted} 条孤儿标签关联`
            : "没有可清理的孤儿关联",
        );
        router.refresh();
      } else {
        toast.error(res.message ?? "清理失败,请重试");
      }
    });
  };

  return (
    <ConfirmDialog
      destructive
      title="清理孤儿标签关联"
      description={`将删除 ${count} 条指向已不存在作品/项目的标签关联记录。此操作不可撤销。`}
      confirmText="清理"
      onConfirm={handleCleanup}
      trigger={
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 />
          一键清理
        </Button>
      }
    />
  );
}
