// 导出页加载骨架 —— 头部 + 三张卡片占位。
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-72" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="space-y-4 rounded-xl border border-border bg-card p-6 ring-1 ring-foreground/5"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-40 rounded-lg" />
          </div>
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
