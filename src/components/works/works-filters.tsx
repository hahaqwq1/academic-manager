"use client";

// 作品列表筛选器 —— Phase 2 [K] / P3-11 改为泛型 EntityFilters 的配置包装
//
// 仅声明作品域的下拉项(类型 / 状态 / 标签),URL query / 防抖 / 清除等通用逻辑由 EntityFilters 承担。
import {
  EntityFilters,
  type FilterSelectConfig,
} from "@/components/common/entity-filters";
import type { Tag } from "@/db/schema";
import { WORK_STATUSES, WORK_TYPES, WORK_TYPE_LABELS } from "@/lib/constants";

interface WorksFiltersProps {
  allTags: Tag[];
}

export function WorksFilters({ allTags }: WorksFiltersProps) {
  const selects: FilterSelectConfig[] = [
    {
      paramKey: "type",
      ariaLabel: "按类型筛选",
      placeholder: "类型",
      allLabel: "全部类型",
      options: WORK_TYPES.map((type) => ({
        value: type,
        label: WORK_TYPE_LABELS[type],
      })),
    },
    {
      paramKey: "status",
      ariaLabel: "按状态筛选",
      placeholder: "状态",
      allLabel: "全部状态",
      options: WORK_STATUSES.map((status) => ({
        value: status,
        label: status,
      })),
    },
    // 标签下拉:始终声明(无标签时 options 为空,EntityFilters 自动不渲染,
    // 但 paramKey 仍计入 hasFilters,使陈旧 ?tag=N 也能触发「清除筛选」)。
    {
      paramKey: "tag",
      ariaLabel: "按标签筛选",
      placeholder: "标签",
      allLabel: "全部标签",
      triggerWidth: "sm:w-36",
      options: allTags.map((tag) => ({
        value: String(tag.id),
        label: tag.name,
      })),
    },
  ];

  return (
    <EntityFilters
      searchPlaceholder="搜索标题 / 摘要 / 作者 / 备注…"
      searchAriaLabel="搜索作品"
      selects={selects}
      dateRange={{
        fromKey: "from",
        toKey: "to",
        labels: ["发表起始日期", "发表结束日期"],
      }}
    />
  );
}
