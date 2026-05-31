"use client";

// 看板图表 —— Phase 5(client,基于 recharts)
//
// 三个图表共用主题色变量(--chart-1..5 / --border / --muted-foreground / --card / --foreground):
//   - PublicationsBarChart:年度发表数(纵向柱状图)。
//   - TagPieChart:主题方向分布(环形饼图)。
//   - ReviewCycleChart:各刊平均审稿周期(横向柱状图)。
// 数据由 server 端聚合后传入;空数据时渲染占位文案。
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { YearCount, JournalCycle } from "@/db/queries/dashboard";

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

// 年度发表数:纵向柱状图。
export function PublicationsBarChart({ data }: { data: YearCount[] }) {
  return (
    <div className="h-64">
      {data.length === 0 ? (
        <ChartEmpty text="暂无已发表作品" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
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
        </ResponsiveContainer>
      )}
    </div>
  );
}

// 主题方向分布:环形饼图。
export function TagPieChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  return (
    <div className="h-64">
      {data.length === 0 ? (
        <ChartEmpty text="暂无带标签的成果" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
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
        </ResponsiveContainer>
      )}
    </div>
  );
}

// 各刊平均审稿周期:横向柱状图(天)。
export function ReviewCycleChart({ data }: { data: JournalCycle[] }) {
  return (
    <div className="h-64">
      {data.length === 0 ? (
        <ChartEmpty text="暂无已出结果的投稿可统计" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
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
        </ResponsiveContainer>
      )}
    </div>
  );
}
