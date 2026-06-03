// EntityFilters 组件测试 —— 升级线(组件测试体系)
//
// 核心是「筛选状态全存 URL query」:验证搜索框防抖后 router.replace、清除关键词、
// 以及下拉触发器的无障碍名。next/navigation 在测试环境无 Provider,需 mock。
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/works",
  useSearchParams: () => new URLSearchParams(),
}));

import {
  EntityFilters,
  type FilterSelectConfig,
} from "@/components/common/entity-filters";

const selects: FilterSelectConfig[] = [
  {
    paramKey: "type",
    ariaLabel: "按类型筛选",
    placeholder: "类型",
    allLabel: "全部类型",
    options: [
      { value: "paper", label: "论文" },
      { value: "draft", label: "草稿" },
    ],
  },
  {
    paramKey: "status",
    ariaLabel: "按状态筛选",
    placeholder: "状态",
    allLabel: "全部状态",
    options: [{ value: "已发表", label: "已发表" }],
  },
];

function renderFilters() {
  return render(
    <EntityFilters
      searchPlaceholder="搜索标题或摘要…"
      searchAriaLabel="搜索作品"
      selects={selects}
    />,
  );
}

beforeEach(() => {
  replace.mockClear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("EntityFilters", () => {
  it("渲染搜索框与各下拉触发器(带无障碍名)", () => {
    renderFilters();
    expect(
      screen.getByRole("searchbox", { name: "搜索作品" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "按类型筛选" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "按状态筛选" }),
    ).toBeInTheDocument();
  });

  it("搜索输入防抖 300ms 后写入 URL query(q)", () => {
    renderFilters();
    const input = screen.getByRole("searchbox", { name: "搜索作品" });
    fireEvent.change(input, { target: { value: "量子" } });
    // 防抖未到不应写入。
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(replace).toHaveBeenCalledWith("/works?q=%E9%87%8F%E5%AD%90", {
      scroll: false,
    });
  });

  it("出现清除关键词按钮,点击后清空 q 回到列表页", () => {
    renderFilters();
    const input = screen.getByRole("searchbox", { name: "搜索作品" });
    fireEvent.change(input, { target: { value: "x" } });
    const clearBtn = screen.getByRole("button", { name: "清除搜索" });
    fireEvent.click(clearBtn);
    // 清除关键词立即写入(q=null → 回到无 query 的 /works)。
    expect(replace).toHaveBeenLastCalledWith("/works", { scroll: false });
  });
});
