// 看板统计卡 —— Phase 5(纯展示,server 安全)
//
// 顶部一行的关键数字卡:图标 + 数值 + 标签 + 可选说明。
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
}

export function StatCard({ icon: Icon, label, value, hint }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {label}
            {hint ? <span className="ml-1 opacity-70">· {hint}</span> : null}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
