// 在投视图加载骨架 —— 头部 + 概览条 + 若干卡片行。
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-5 w-40" />
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="space-y-2 rounded-xl border border-border bg-card px-4 py-3.5 ring-1 ring-foreground/5"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-5 w-12 rounded-4xl" />
              <Skeleton className="h-5 w-16 rounded-4xl" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
