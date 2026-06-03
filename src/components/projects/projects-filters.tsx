"use client";

// 项目列表筛选器 —— Phase 3 / P3-11 改为泛型 EntityFilters 的配置包装
//
// 仅声明项目域的下拉项(级别 / 状态 / 标签),URL query / 防抖 / 清除等通用逻辑由 EntityFilters 承担。
import {
  EntityFilters,
  type FilterSelectConfig,
} from "@/components/common/entity-filters";
import type { Tag } from "@/db/schema";
import { PROJECT_LEVELS, PROJECT_STATUSES } from "@/lib/constants";

interface ProjectsFiltersProps {
  allTags: Tag[];
}

export function ProjectsFilters({ allTags }: ProjectsFiltersProps) {
  const selects: FilterSelectConfig[] = [
    {
      paramKey: "level",
      ariaLabel: "按级别筛选",
      placeholder: "级别",
      allLabel: "全部级别",
      options: PROJECT_LEVELS.map((level) => ({ value: level, label: level })),
    },
    {
      paramKey: "status",
      ariaLabel: "按状态筛选",
      placeholder: "状态",
      allLabel: "全部状态",
      options: PROJECT_STATUSES.map((status) => ({
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
      searchPlaceholder="搜索名称 / 备注 / 编号…"
      searchAriaLabel="搜索项目"
      selects={selects}
    />
  );
}
