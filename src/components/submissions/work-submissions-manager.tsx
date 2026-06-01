"use client";

// 作品投稿管理 —— Phase 4(作品详情页内)
//
// 列出某作品的全部投稿轮次,并提供新增 / 编辑(对话框表单)/ 删除(二次确认)。
// 表单字段:期刊、轮次、状态、投稿日期(必填)、出结果日期(可空)、审稿意见(可空)。
// 提交走 createSubmission / updateSubmission(传纯对象);成功后关闭对话框 + router.refresh。
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { SubmissionStatusBadge } from "@/components/submissions/submission-badges";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createSubmission,
  deleteSubmission,
  updateSubmission,
} from "@/lib/actions/submissions";
import { markWorkPublished } from "@/lib/actions/works";
import type { Submission } from "@/db/schema";
import {
  SUBMISSION_STATUSES,
  type SubmissionStatus,
} from "@/lib/constants";
import type { SubmissionInput } from "@/lib/validations";
import { formatDate } from "@/lib/format";

interface WorkSubmissionsManagerProps {
  workId: number;
  submissions: Submission[];
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

// 新增 / 编辑投稿轮次的对话框(自管开合)。表单本体抽成 <SubmissionForm>:
// Radix 对话框关闭即卸载内容,故每次打开都会重新挂载并以 props 初始化字段——
// 无需用 effect 在打开时同步 state(那会触发级联渲染,React 也不推荐)。
function SubmissionFormDialog({
  workId,
  submission,
  defaultRound,
  trigger,
  onSuggestPublish,
}: {
  workId: number;
  submission?: Submission;
  defaultRound: number;
  trigger: React.ReactNode;
  onSuggestPublish: () => void;
}) {
  const isEdit = submission !== undefined;
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑投稿轮次" : "新增投稿轮次"}</DialogTitle>
          <DialogDescription>
            记录该作品一次投稿的期刊、轮次、状态与审稿进度。
          </DialogDescription>
        </DialogHeader>
        <SubmissionForm
          workId={workId}
          submission={submission}
          isEdit={isEdit}
          defaultRound={defaultRound}
          onClose={() => setOpen(false)}
          onSuggestPublish={onSuggestPublish}
        />
      </DialogContent>
    </Dialog>
  );
}

// 表单本体:对话框打开时挂载,直接以 props 初始化各字段;关闭即卸载,下次打开即新鲜状态。
function SubmissionForm({
  workId,
  submission,
  isEdit,
  defaultRound,
  onClose,
  onSuggestPublish,
}: {
  workId: number;
  submission?: Submission;
  isEdit: boolean;
  defaultRound: number;
  onClose: () => void;
  onSuggestPublish: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [journal, setJournal] = useState(submission?.journal ?? "");
  const [round, setRound] = useState(String(submission?.round ?? defaultRound));
  const [status, setStatus] = useState<SubmissionStatus>(
    submission?.status ?? "在审"
  );
  const [submittedAt, setSubmittedAt] = useState(submission?.submitted_at ?? "");
  const [decidedAt, setDecidedAt] = useState(submission?.decided_at ?? "");
  const [reviewNotes, setReviewNotes] = useState(submission?.review_notes ?? "");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedRound = round.trim() === "" ? NaN : Number(round);
    const values: SubmissionInput = {
      journal,
      round: Number.isNaN(parsedRound) ? (0 as unknown as number) : parsedRound,
      status,
      submitted_at: submittedAt,
      decided_at: decidedAt === "" ? null : decidedAt,
      review_notes: reviewNotes === "" ? null : reviewNotes,
    };

    startTransition(async () => {
      const res = isEdit
        ? await updateSubmission(workId, submission!.id, values)
        : await createSubmission(workId, values);
      if (!res.ok) {
        setErrors(res.errors ?? {});
        if (res.message) toast.error(res.message);
        return;
      }
      toast.success(isEdit ? "已更新投稿轮次" : "已新增投稿轮次");
      onClose();
      router.refresh();
      // 录用且作品尚未「已发表」:交由父组件(常驻挂载)弹出联动提示(P2-9 方案A)。
      if (res.suggestPublish) onSuggestPublish();
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="sub-journal">
            期刊 / 投稿目标 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sub-journal"
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
            placeholder="如:民族研究"
          />
          <FieldError message={errors.journal} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sub-round">
            轮次 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sub-round"
            type="number"
            min={1}
            value={round}
            onChange={(e) => setRound(e.target.value)}
          />
          <FieldError message={errors.round} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sub-status">
            状态 <span className="text-destructive">*</span>
          </Label>
          <Select value={status} onValueChange={(v) => setStatus(v as SubmissionStatus)}>
            <SelectTrigger id="sub-status" className="w-full">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent>
              {SUBMISSION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.status} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sub-submitted">
            投稿日期 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sub-submitted"
            type="date"
            value={submittedAt}
            onChange={(e) => setSubmittedAt(e.target.value)}
          />
          <FieldError message={errors.submitted_at} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sub-decided">出结果日期</Label>
          <Input
            id="sub-decided"
            type="date"
            value={decidedAt}
            onChange={(e) => setDecidedAt(e.target.value)}
          />
          <FieldError message={errors.decided_at} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="sub-notes">审稿意见 / 周期备注</Label>
          <Textarea
            id="sub-notes"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="审稿意见摘要、周期备注等"
          />
          <FieldError message={errors.review_notes} />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          取消
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "提交中…" : isEdit ? "保存" : "新增"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function WorkSubmissionsManager({
  workId,
  submissions,
}: WorkSubmissionsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const nextRound =
    submissions.length > 0
      ? Math.max(...submissions.map((s) => s.round)) + 1
      : 1;

  const handleDelete = (id: number) => {
    startTransition(async () => {
      const res = await deleteSubmission(workId, id);
      if (res.ok) {
        toast.success("已删除该轮次");
        router.refresh();
      } else {
        toast.error(res.message ?? "删除失败,请重试");
      }
    });
  };

  // 录用联动提示(P2-9 方案A):投稿被录用且作品尚未「已发表」时弹出,
  // 提供「标为已发表」一键动作;由用户拍板,不自动改作品状态。
  // 放在常驻挂载的本组件(而非随对话框卸载的表单)里,确保点击动作时上下文仍在。
  const handleSuggestPublish = () => {
    toast("该投稿已录用 —— 是否将作品标记为「已发表」?", {
      description: "作品当前状态尚未标为「已发表」。发表日期可稍后在编辑页补填。",
      duration: 10000,
      action: {
        label: "标为已发表",
        onClick: () => {
          startTransition(async () => {
            const res = await markWorkPublished(workId);
            if (res.ok) {
              toast.success("已将作品标记为「已发表」");
              router.refresh();
            } else {
              toast.error(res.message ?? "操作失败,请重试");
            }
          });
        },
      },
    });
  };

  return (
    <div className="space-y-3" aria-busy={isPending}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          投稿记录
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            共 {submissions.length} 轮
          </span>
        </p>
        <SubmissionFormDialog
          workId={workId}
          defaultRound={nextRound}
          onSuggestPublish={handleSuggestPublish}
          trigger={
            <Button size="sm" variant="outline">
              <Plus />
              新增轮次
            </Button>
          }
        />
      </div>

      {submissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          尚无投稿记录。点击「新增轮次」记录第一次投稿。
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg ring-1 ring-foreground/10">
          {submissions.map((s) => (
            <li key={s.id} className="space-y-1.5 bg-card px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">第 {s.round} 轮</Badge>
                <span className="text-sm font-medium text-foreground">
                  {s.journal}
                </span>
                <SubmissionStatusBadge status={s.status} />
                <div className="ml-auto flex items-center gap-1">
                  <SubmissionFormDialog
                    workId={workId}
                    submission={s}
                    defaultRound={nextRound}
                    onSuggestPublish={handleSuggestPublish}
                    trigger={
                      <Button variant="ghost" size="sm" aria-label="编辑轮次">
                        <Pencil />
                        编辑
                      </Button>
                    }
                  />
                  <ConfirmDialog
                    destructive
                    title="删除投稿轮次"
                    description={`确定删除「${s.journal}」第 ${s.round} 轮的投稿记录吗?此操作不可撤销。`}
                    confirmText="删除"
                    onConfirm={() => handleDelete(s.id)}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label="删除轮次"
                      >
                        <Trash2 />
                        删除
                      </Button>
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="size-3" />
                  投于 {formatDate(s.submitted_at)}
                </span>
                <span>
                  结果 {s.decided_at ? formatDate(s.decided_at) : "未出"}
                </span>
              </div>
              {s.review_notes ? (
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {s.review_notes}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
