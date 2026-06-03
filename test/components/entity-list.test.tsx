// EntityList 组件测试 —— 升级线(组件测试体系)
//
// 泛型列表壳:验证每行标题/详情链接、编辑链接、删除按钮无障碍名,以及空列表结构。
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EntityList } from "@/components/common/entity-list";

interface Row {
  id: number;
  title: string;
}

function renderList(items: Row[]) {
  return render(
    <EntityList<Row>
      items={items}
      getId={(r) => r.id}
      getTitle={(r) => r.title}
      getDetailHref={(r) => `/works/${r.id}`}
      getEditHref={(r) => `/works/${r.id}/edit`}
      renderBadges={(r) => <span>{r.title}-标签</span>}
      renderMeta={(r) => <span>meta-{r.id}</span>}
      onDelete={vi.fn(async () => ({ ok: true }))}
      deleteTitle="删除作品"
      getDeleteDescription={(r) => `确定删除「${r.title}」吗?`}
    />,
  );
}

describe("EntityList", () => {
  it("渲染每行标题、详情/编辑链接与删除按钮无障碍名", () => {
    renderList([
      { id: 1, title: "甲" },
      { id: 2, title: "乙" },
    ]);

    // 标题即详情链接,href 指向详情页。
    expect(screen.getByRole("link", { name: "甲" })).toHaveAttribute(
      "href",
      "/works/1",
    );
    expect(screen.getByRole("link", { name: "乙" })).toHaveAttribute(
      "href",
      "/works/2",
    );

    // 每行一个「编辑」链接,href 指向编辑页。
    const editLinks = screen.getAllByRole("link", { name: /编辑/ });
    expect(editLinks).toHaveLength(2);
    expect(editLinks[0]).toHaveAttribute("href", "/works/1/edit");

    // 删除按钮带逐项 aria-label(无障碍:图标按钮需可读名)。
    expect(screen.getByRole("button", { name: "删除 甲" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除 乙" })).toBeInTheDocument();
  });

  it("空列表渲染空的 ul", () => {
    const { container } = renderList([]);
    const ul = container.querySelector("ul");
    expect(ul).toBeInTheDocument();
    expect(ul?.querySelectorAll("li")).toHaveLength(0);
  });
});
