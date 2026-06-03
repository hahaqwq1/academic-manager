"use client";

// 看板图表懒加载包装 —— 升级线(体验层 / 性能)
//
// recharts 体积可观;用 next/dynamic(ssr:false)把三个图表从首屏 JS 拆出,客户端按需加载。
// ssr:false 必须在 client 组件里调用(Next 16:Server Component 内不允许),故本文件 "use client";
// 看板页(server)改从这里 import,渲染时先出骨架、recharts 到位后替换。
import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

// 与 charts.tsx 的 h-64 容器同高,加载期间占位不跳动。
const ChartSkeleton = () => <Skeleton className="h-64 w-full rounded-lg" />;

export const PublicationsBarChart = dynamic(
  () => import("./charts").then((m) => m.PublicationsBarChart),
  { ssr: false, loading: ChartSkeleton },
);

export const TagPieChart = dynamic(
  () => import("./charts").then((m) => m.TagPieChart),
  { ssr: false, loading: ChartSkeleton },
);

export const ReviewCycleChart = dynamic(
  () => import("./charts").then((m) => m.ReviewCycleChart),
  { ssr: false, loading: ChartSkeleton },
);

export const SubmissionOutcomePie = dynamic(
  () => import("./charts").then((m) => m.SubmissionOutcomePie),
  { ssr: false, loading: ChartSkeleton },
);

export const SubmissionTrendChart = dynamic(
  () => import("./charts").then((m) => m.SubmissionTrendChart),
  { ssr: false, loading: ChartSkeleton },
);

export const CumulativePublicationsChart = dynamic(
  () => import("./charts").then((m) => m.CumulativePublicationsChart),
  { ssr: false, loading: ChartSkeleton },
);

export const PublicationRolePie = dynamic(
  () => import("./charts").then((m) => m.PublicationRolePie),
  { ssr: false, loading: ChartSkeleton },
);

export const PublicationTypePie = dynamic(
  () => import("./charts").then((m) => m.PublicationTypePie),
  { ssr: false, loading: ChartSkeleton },
);

export const FundingByLevelChart = dynamic(
  () => import("./charts").then((m) => m.FundingByLevelChart),
  { ssr: false, loading: ChartSkeleton },
);
