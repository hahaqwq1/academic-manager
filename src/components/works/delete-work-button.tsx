"use client";

// 作品删除按钮 —— Phase 2 [N2]
//
// 详情页专用:基于通用 ConfirmDialog(危险样式)二次确认后调用 deleteWork。
// 删除成功后跳回作品列表(列表页删除走 works-list 的乐观删除,不用此组件)。
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteWork } from "@/lib/actions/works";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";

interface DeleteWorkButtonProps {
  id: number;
  title: string;
}

export function DeleteWorkButton({ id, title }: DeleteWorkButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 确认删除:调用 server action;成功提示并导航回列表,失败仅提示、留在原页。
  const handleConfirm = async () => {
    const res = await deleteWork(id);
    if (!res.ok) {
      toast.error(res.message ?? "删除失败,请重试");
      return;
    }
    toast.success(`已删除「${title}」`);
    // 跳回列表并刷新,使列表反映最新数据。
    startTransition(() => {
      router.push("/works");
      router.refresh();
    });
  };

  return (
    <ConfirmDialog
      destructive
      title="删除作品"
      description={`确定要删除「${title}」吗?该操作不可撤销,相关投稿记录与项目关联也将一并移除。`}
      confirmText="删除"
      onConfirm={handleConfirm}
      trigger={
        <Button variant="destructive" disabled={isPending}>
          <Trash2 />
          删除
        </Button>
      }
    />
  );
}
