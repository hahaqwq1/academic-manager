// 投稿状态徽标 —— Phase 4 共享 UI
//
// 在审(进行中)→ primary;退修(待修改)→ warning;录用(终态正向)→ success;
// 被拒(终态负向)→ destructive 软红;已撤稿(中止)→ 中性。
// 纯展示组件,可在 server 组件中直接使用。
import { Badge } from "@/components/ui/badge";
import type { SubmissionStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_CLASSNAME: Record<SubmissionStatus, string> = {
  在审: "bg-primary/10 text-primary border-primary/20",
  退修: "bg-warning/10 text-warning border-warning/20",
  录用: "bg-success/10 text-success border-success/20",
  被拒: "bg-destructive/10 text-destructive border-destructive/20",
  已撤稿: "bg-muted text-muted-foreground border-border",
};

export function SubmissionStatusBadge({
  status,
}: {
  status: SubmissionStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STATUS_CLASSNAME[status])}
    >
      {status}
    </Badge>
  );
}
