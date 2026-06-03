"use client";

// 看板图表 —— Phase 5(client,基于 recharts)
//
// 所有图表共用主题色变量(--chart-1..5 / --border / --muted-foreground / --card / --foreground);
// 数据由 server 端聚合后传入;空数据时渲染占位文案。
// 无障碍:每个图表用 ChartFrame 包一层 role="img" + aria-label(含数据摘要),
// 让屏幕阅读器把整张图当作一张带文字描述的图片(recharts 的 SVG 内部不再逐节点暴露)。
import type { ReactElement } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  CumulativeYear,
  FundingByLevel,
  OutcomeCount,
  RoleCount,
  SubmissionYearTrend,
  TypeCount,
} from "@/db/queries/analytics";
import type { JournalCycle, YearCount } from "@/db/queries/dashboard";
import { WORK_TYPE_LABELS } from "@/lib/constants";

// 统一的 Tooltip 容器样式(贴合主题)。
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--foreground)",
} as const;

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 } as const;

function ChartEmpty({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

// 图表外壳:统一高度 + 无障碍标注。空数据时渲染占位;否则把图表交给 ResponsiveContainer。
function ChartFrame({
  label,
  summary,
  isEmpty,
  emptyText,
  children,
}: {
  label: string;
  summary: string;
  isEmpty: boolean;
  emptyText: string;
  children: ReactElement;
}) {
  return (
    <div
      className="h-64"
      role="img"
      aria-label={isEmpty ? `${label}:${emptyText}` : `${label}。${summary}`}
    >
      {isEmpty ? (
        <ChartEmpty text={emptyText} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
}

// 年度发表数:纵向柱状图。
export function PublicationsBarChart({ data }: { data: YearCount[] }) {
  return (
    <ChartFrame
      label="年度发表数柱状图"
      summary={data.map((d) => `${d.year} 年 ${d.count} 篇`).join("、")}
      isEmpty={data.length === 0}
      emptyText="暂无已发表作品"
    >
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="year"
          tick={axisTick}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          contentStyle={tooltipStyle}
          labelStyle={{ color: "var(--foreground)" }}
          formatter={(value) => [`${value} 篇`, "发表"]}
        />
        <Bar
          dataKey="count"
          fill="var(--chart-1)"
          radius={[4, 4, 0, 0]}
          maxBarSize={56}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartFrame>
  );
}

// 主题方向分布:环形饼图。
export function TagPieChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  return (
    <ChartFrame
      label="主题方向分布饼图"
      summary={data.map((d) => `${d.name} ${d.count} 项`).join("、")}
      isEmpty={data.length === 0}
      emptyText="暂无带标签的成果"
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={46}
          paddingAngle={2}
          isAnimationActive={false}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={`var(--chart-${(i % 5) + 1})`} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [`${value} 项`, name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
        />
      </PieChart>
    </ChartFrame>
  );
}

// 各刊平均审稿周期:横向柱状图(天)。
export function ReviewCycleChart({ data }: { data: JournalCycle[] }) {
  return (
    <ChartFrame
      label="各刊平均审稿周期柱状图"
      summary={data.map((d) => `${d.journal} ${d.avgDays} 天`).join("、")}
      isEmpty={data.length === 0}
      emptyText="暂无已出结果的投稿可统计"
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          horizontal={false}
        />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="journal"
          tick={axisTick}
          width={120}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          contentStyle={tooltipStyle}
          formatter={(value) => [`${value} 天`, "平均周期"]}
        />
        <Bar
          dataKey="avgDays"
          fill="var(--chart-2)"
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartFrame>
  );
}

// 投稿结果分布:环形饼。
export function SubmissionOutcomePie({ data }: { data: OutcomeCount[] }) {
  return (
    <ChartFrame
      label="投稿结果分布饼图"
      summary={data.map((d) => `${d.status} ${d.count} 篇`).join("、")}
      isEmpty={data.length === 0}
      emptyText="暂无投稿记录"
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={46}
          paddingAngle={2}
          isAnimationActive={false}
        >
          {data.map((e, i) => (
            <Cell key={e.status} fill={`var(--chart-${(i % 5) + 1})`} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [`${value} 篇`, name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
        />
      </PieChart>
    </ChartFrame>
  );
}

// 投稿量逐年:纵向柱(平均审稿周期见各刊周期图)。
export function SubmissionTrendChart({
  data,
}: {
  data: SubmissionYearTrend[];
}) {
  return (
    <ChartFrame
      label="投稿量逐年柱状图"
      summary={data.map((d) => `${d.year} 年 ${d.count} 篇`).join("、")}
      isEmpty={data.length === 0}
      emptyText="暂无投稿记录"
    >
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="year"
          tick={axisTick}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          contentStyle={tooltipStyle}
          formatter={(value) => [`${value} 篇`, "投稿量"]}
        />
        <Bar
          dataKey="count"
          fill="var(--chart-3)"
          radius={[4, 4, 0, 0]}
          maxBarSize={56}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartFrame>
  );
}

// 累计发表曲线:折线。
export function CumulativePublicationsChart({
  data,
}: {
  data: CumulativeYear[];
}) {
  return (
    <ChartFrame
      label="累计发表曲线"
      summary={data
        .map((d) => `${d.year} 年累计 ${d.cumulative} 篇`)
        .join("、")}
      isEmpty={data.length === 0}
      emptyText="暂无已发表作品"
    >
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="year"
          tick={axisTick}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [`${value} 篇`, "累计"]}
        />
        <Line
          type="monotone"
          dataKey="cumulative"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartFrame>
  );
}

// 已发表作者角色分布:环形饼(role 即中文标签)。
export function PublicationRolePie({ data }: { data: RoleCount[] }) {
  return (
    <ChartFrame
      label="已发表作者角色分布饼图"
      summary={data.map((d) => `${d.role} ${d.count} 篇`).join("、")}
      isEmpty={data.length === 0}
      emptyText="暂无已发表作品"
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="role"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={46}
          paddingAngle={2}
          isAnimationActive={false}
        >
          {data.map((e, i) => (
            <Cell key={e.role} fill={`var(--chart-${(i % 5) + 1})`} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [`${value} 篇`, name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
        />
      </PieChart>
    </ChartFrame>
  );
}

// 已发表类型分布:环形饼(英文 key 映射中文标签)。
export function PublicationTypePie({ data }: { data: TypeCount[] }) {
  const rows = data.map((d) => ({
    name: WORK_TYPE_LABELS[d.type],
    count: d.count,
  }));
  return (
    <ChartFrame
      label="已发表类型分布饼图"
      summary={rows.map((d) => `${d.name} ${d.count} 篇`).join("、")}
      isEmpty={rows.length === 0}
      emptyText="暂无已发表作品"
    >
      <PieChart>
        <Pie
          data={rows}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={46}
          paddingAngle={2}
          isAnimationActive={false}
        >
          {rows.map((e, i) => (
            <Cell key={e.name} fill={`var(--chart-${(i % 5) + 1})`} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [`${value} 篇`, name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
        />
      </PieChart>
    </ChartFrame>
  );
}

// 经费按级别×币种:横向柱(总额)。
export function FundingByLevelChart({ data }: { data: FundingByLevel[] }) {
  const rows = data.map((d) => ({
    name: `${d.level}·${d.currency}`,
    total: d.total,
  }));
  return (
    <ChartFrame
      label="经费按级别与币种汇总柱状图"
      summary={rows.map((d) => `${d.name} ${d.total}`).join("、")}
      isEmpty={rows.length === 0}
      emptyText="暂无结构化经费(请在项目里填经费金额)"
    >
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={axisTick}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={axisTick}
          width={110}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          contentStyle={tooltipStyle}
          formatter={(value) => [`${value}`, "经费"]}
        />
        <Bar
          dataKey="total"
          fill="var(--chart-4)"
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartFrame>
  );
}
