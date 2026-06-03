// WorkSubmissionsManager 组件测试 —— 升级线(组件测试体系)
//
// 投稿管理:验证列表渲染(轮次/期刊/状态/计数)、空态、图标按钮无障碍名,以及对话框可打开。
// 组件 import 了 "use server" 的 action 模块(经 @/db 链到 server-only,测试环境会抛),故整模块 mock。
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/actions/submissions", () => ({
  createSubmission: vi.fn(),
  updateSubmission: vi.fn(),
  deleteSubmission: vi.fn(),
}));
vi.mock("@/lib/actions/works", () => ({
  markWorkPublished: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

import { WorkSubmissionsManager } from "@/components/submissions/work-submissions-manager";
import type { Submission } from "@/db/schema";

const submissions: Submission[] = [
  {
    id: 10,
    work_id: 1,
    journal: "民族研究",
    round: 1,
    status: "退修",
    submitted_at: "2024-01-01",
    decided_at: "2024-03-01",
    review_notes: "小修后重投",
  },
  {
    id: 11,
    work_id: 1,
    journal: "社会学评论",
    round: 2,
    status: "在审",
    submitted_at: "2024-04-01",
    decided_at: null,
    review_notes: null,
  },
];

describe("WorkSubmissionsManager", () => {
  it("渲染各轮次:期刊、轮次徽标、计数与图标按钮无障碍名", () => {
    render(<WorkSubmissionsManager workId={1} submissions={submissions} />);

    expect(screen.getByText(/共 2 轮/)).toBeInTheDocument();
    expect(screen.getByText("民族研究")).toBeInTheDocument();
    expect(screen.getByText("社会学评论")).toBeInTheDocument();
    expect(screen.getByText("第 1 轮")).toBeInTheDocument();
    expect(screen.getByText("第 2 轮")).toBeInTheDocument();
    expect(screen.getByText("小修后重投")).toBeInTheDocument();

    // 图标按钮的无障碍名(a11y):每行一个编辑、一个删除。
    expect(screen.getAllByRole("button", { name: "编辑轮次" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "删除轮次" })).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: /新增轮次/ }),
    ).toBeInTheDocument();
  });

  it("无投稿时显示空态文案,但仍可新增", () => {
    render(<WorkSubmissionsManager workId={1} submissions={[]} />);
    expect(screen.getByText(/尚无投稿记录/)).toBeInTheDocument();
    expect(screen.getByText(/共 0 轮/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /新增轮次/ }),
    ).toBeInTheDocument();
  });

  it("点击「新增轮次」打开对话框表单", async () => {
    const user = userEvent.setup();
    render(<WorkSubmissionsManager workId={1} submissions={[]} />);
    await user.click(screen.getByRole("button", { name: /新增轮次/ }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("新增投稿轮次")).toBeInTheDocument();
    // 表单关键字段就位。
    expect(screen.getByLabelText(/期刊/)).toBeInTheDocument();
    expect(screen.getByLabelText(/投稿日期/)).toBeInTheDocument();
  });
});
