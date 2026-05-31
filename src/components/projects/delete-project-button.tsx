"use client";

// 项目删除按钮 —— Phase 3(详情页专用)
//
// 基于通用 ConfirmDialog(危险样式)二次确认后调用 deleteProject。
// 删除成功后跳回项目列表(列表页删除走 projects-list 的乐观删除,不用此组件)。
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteProject } from "@/lib/actions/projects";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";

interface DeleteProjectButtonProps {
  id: number;
  title: string;
}

export function DeleteProjectButton({ id, title }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleConfirm = async () => {
    const res = await deleteProject(id);
    if (!res.ok) {
      toast.error(res.message ?? "删除失败,请重试");
      return;
    }
    toast.success(`已删除「${title}」`);
    startTransition(() => {
      router.push("/projects");
      router.refresh();
    });
  };

  return (
    <ConfirmDialog
      destructive
      title="删除项目"
      description={`确定要删除「${title}」吗?该操作不可撤销,成果挂接与标签关联也将一并移除。`}
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
