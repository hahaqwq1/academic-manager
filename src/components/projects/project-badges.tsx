// 项目徽标 —— Phase 3 共享 UI
//
// ProjectLevelBadge:项目级别,按级别映射语义色(国家级最显眼)。
// ProjectRoleBadge:主持 / 参与,主持用主色软底、参与用中性。
// ProjectStatusBadge:项目状态,按阶段映射语义色软底实字。
//
// 纯展示组件,无交互,可在 server 组件中直接使用(无需 "use client")。
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectLevel, ProjectRole, ProjectStatus } from "@/lib/constants";

// 级别 → 语义色:国家级(primary 主色)> 省部级(info)> 校级 / 其他(中性)。
const LEVEL_CLASSNAME: Record<ProjectLevel, string> = {
  国家级: "bg-primary/10 text-primary border-primary/20",
  省部级: "bg-info/10 text-info border-info/20",
  校级: "bg-muted text-muted-foreground border-border",
  其他: "bg-muted text-muted-foreground border-border",
};

export function ProjectLevelBadge({ level }: { level: ProjectLevel }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", LEVEL_CLASSNAME[level])}
    >
      {level}
    </Badge>
  );
}

// 角色:主持(突出,主色软底)/ 参与(中性)。
export function ProjectRoleBadge({ role }: { role: ProjectRole }) {
  return role === "主持" ? (
    <Badge
      variant="outline"
      className="border-primary/20 bg-primary/10 font-medium text-primary"
    >
      主持
    </Badge>
  ) : (
    <Badge variant="secondary">参与</Badge>
  );
}

// 状态 → 语义色软底实字:
// 拟申报(未启动)→ 中性;申报中(进行、待结果)→ warning;已立项(活跃)→ primary;
// 结题中(收尾)→ info;已结题(终态正向)→ success;未中(终态负向)→ destructive 软红。
const STATUS_CLASSNAME: Record<ProjectStatus, string> = {
  拟申报: "bg-muted text-muted-foreground border-border",
  申报中: "bg-warning/10 text-warning border-warning/20",
  已立项: "bg-primary/10 text-primary border-primary/20",
  结题中: "bg-info/10 text-info border-info/20",
  已结题: "bg-success/10 text-success border-success/20",
  未中: "bg-destructive/10 text-destructive border-destructive/20",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STATUS_CLASSNAME[status])}
    >
      {status}
    </Badge>
  );
}
