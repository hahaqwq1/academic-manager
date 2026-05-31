// 作品徽标 —— Phase 2 共享 UI [F]
//
// WorkTypeBadge:作品类型,中性风格(secondary),显示 WORK_TYPE_LABELS 中文 label。
// WorkStatusBadge:进度状态,按状态映射语义色软底实字(bg-X/10 text-X border-X/20)。
//
// 纯展示组件,无交互,可在 server 组件中直接使用(无需 "use client")。
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  WORK_TYPE_LABELS,
  type WorkStatus,
  type WorkType,
} from "@/lib/constants";

// 作品类型徽标:中性灰底,弱化呈现(类型本身不传达紧迫度)。
export function WorkTypeBadge({ type }: { type: WorkType }) {
  return <Badge variant="secondary">{WORK_TYPE_LABELS[type]}</Badge>;
}

// 状态 → 语义色软底实字 className 的映射表。
// 已发表(终态正向)→ success;已完成(阶段完成、待投稿)→ info;
// 投稿中(活跃进行态、需跟进)→ primary(与「已完成」的 info 蓝拉开,更显眼);
// 写作中(进行中需推进)→ warning;构思 / 已搁置(未启动 / 暂停)→ muted 中性。
// 软底实字均加 font-medium,提升小号 badge 在浅色软底上的对比度可读性。
const STATUS_CLASSNAME: Record<WorkStatus, string> = {
  构思: "bg-muted text-muted-foreground border-border",
  写作中: "bg-warning/10 text-warning border-warning/20",
  已完成: "bg-info/10 text-info border-info/20",
  投稿中: "bg-primary/10 text-primary border-primary/20",
  已发表: "bg-success/10 text-success border-success/20",
  已搁置: "bg-muted text-muted-foreground border-border",
};

// 作品状态徽标:语义色软底实字,直观传达进度阶段。
export function WorkStatusBadge({ status }: { status: WorkStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STATUS_CLASSNAME[status])}
    >
      {status}
    </Badge>
  );
}
