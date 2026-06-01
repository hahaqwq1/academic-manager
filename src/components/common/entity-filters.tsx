"use client";

// 泛型列表筛选器 —— P3-11(works / projects 筛选器共用)
//
// 两个筛选器此前结构几乎一致:筛选状态全部存放在 URL query(便于分享 / 刷新保留 / 前进后退),
// 组件不持有任何业务 state,只持有搜索框本地输入与防抖 timer。差异仅在「搜索框文案 + 若干下拉项配置」,
// 故抽成泛型壳,下拉项以 selects 配置数组注入(标签下拉由调用方按需追加为其中一项)。
// 行为保持不变:任一筛选变更用 router.replace 更新 query —— 保留其它参数,并把 page 重置为 1。
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Radix Select 不接受空字符串作为 value,用此哨兵表示「全部」。
const ALL = "__all__";

// 单个下拉筛选项的配置。
export interface FilterSelectConfig {
  paramKey: string; // 写入 URL 的 query 键(如 type / status / level / tag)
  ariaLabel: string; // 触发器 aria-label(如「按类型筛选」)
  placeholder: string; // 未选时占位(如「类型」)
  allLabel: string; // 「全部」项文案(如「全部类型」)
  options: { value: string; label: string }[];
  triggerWidth?: string; // 触发器宽度 class,默认 sm:w-32
}

export interface EntityFiltersProps {
  searchPlaceholder: string;
  searchAriaLabel: string;
  selects: FilterSelectConfig[];
}

export function EntityFilters({
  searchPlaceholder,
  searchAriaLabel,
  selects,
}: EntityFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 当前 URL 上的搜索关键词。
  const currentQ = searchParams.get("q") ?? "";

  // 搜索框本地输入(受控),与 URL 解耦以支持防抖。
  const [keyword, setKeyword] = useState(currentQ);
  // 记录上一次同步自 URL 的 q 值,用于在 URL 外部变更(清除筛选 / 浏览器后退)时
  // 于渲染期重置输入框 —— 这是 React 推荐的「渲染中调整 state」模式,优于 useEffect。
  const [syncedQ, setSyncedQ] = useState(currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (currentQ !== syncedQ) {
    setSyncedQ(currentQ);
    setKeyword(currentQ);
  }

  // 基于当前 query 计算新 URL:更新 / 删除某个参数,并把 page 重置为 1。
  const buildQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      // 任一筛选变更都回到第 1 页。
      params.delete("page");
      const queryString = params.toString();
      return queryString ? `${pathname}?${queryString}` : pathname;
    },
    [pathname, searchParams]
  );

  // 立即更新某个参数到 URL。
  const setParam = useCallback(
    (key: string, value: string | null) => {
      router.replace(buildQuery({ [key]: value }), { scroll: false });
    },
    [buildQuery, router]
  );

  // 搜索框输入:本地受控 + 300ms 防抖后写入 URL。
  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParam("q", value.trim() === "" ? null : value.trim());
    }, 300);
  };

  // 仅清除搜索关键词(保留其它筛选)。
  const clearKeyword = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setKeyword("");
    setParam("q", null);
  };

  // 卸载时清理 timer。
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // 清除全部筛选:回到干净的列表页。
  const clearAll = () => {
    setKeyword("");
    router.replace(pathname, { scroll: false });
  };

  // 只渲染有可选项的下拉(如标签:库内无标签时配置仍在但不渲染)。
  const visibleSelects = selects.filter((s) => s.options.length > 0);

  // 是否存在任意筛选(用于决定「清除筛选」是否出现)。
  // 刻意基于全部配置的 paramKey(而非仅渲染出的下拉):这样即便标签下拉未渲染,
  // URL 上的陈旧 ?tag=N 仍能让「清除筛选」出现,与重构前行为一致。
  const hasFilters =
    currentQ !== "" ||
    selects.some((s) => (searchParams.get(s.paramKey) ?? "") !== "");

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* 关键词搜索:左侧放大镜图标,有输入时右侧显示仅清除关键词的 x */}
      <div className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={keyword}
          onChange={(e) => handleKeywordChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchAriaLabel}
          className="pl-8 [&::-webkit-search-cancel-button]:hidden"
        />
        {keyword !== "" ? (
          <button
            type="button"
            onClick={clearKeyword}
            aria-label="清除搜索"
            className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {/* 下拉筛选项(类型 / 状态 / 级别 / 标签…) */}
      {visibleSelects.map((config) => {
        const current = searchParams.get(config.paramKey) ?? "";
        return (
          <Select
            key={config.paramKey}
            value={current === "" ? ALL : current}
            onValueChange={(value) =>
              setParam(config.paramKey, value === ALL ? null : value)
            }
          >
            <SelectTrigger
              className={`w-full ${config.triggerWidth ?? "sm:w-32"}`}
              aria-label={config.ariaLabel}
            >
              <SelectValue placeholder={config.placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{config.allLabel}</SelectItem>
              {config.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}

      {/* 清除筛选 */}
      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-muted-foreground"
        >
          <X />
          清除筛选
        </Button>
      ) : null}
    </div>
  );
}
