// 校验层单元测试 —— P2-7
//
// 纯函数,无 DB。重点回归保护:
// - P0-3 日历真值校验(拒 2024-02-30 / 2024-13-01,接受闰年 2024-02-29)。
// - 可空文本「空串/纯空白 → null,否则 trim」的预处理契约。
// - word_count / round 的 coerce + 边界。
import { describe, expect, it } from "vitest";

import {
  projectInputSchema,
  submissionInputSchema,
  workInputSchema,
} from "@/lib/validations";

describe("workInputSchema", () => {
  const base = { type: "paper", title: "标题", status: "构思" };

  it("最小合法输入:tagIds 缺省为 []", () => {
    const r = workInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.tagIds).toEqual([]);
      expect(r.data.authors).toBeNull();
      expect(r.data.word_count).toBeNull();
      expect(r.data.published_at).toBeNull();
    }
  });

  it("标题首尾空白被 trim", () => {
    const r = workInputSchema.safeParse({ ...base, title: "  论文  " });
    expect(r.success && r.data.title).toBe("论文");
  });

  it("空白标题被拒,报「请输入标题」", () => {
    const r = workInputSchema.safeParse({ ...base, title: "   " });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message === "请输入标题")).toBe(true);
    }
  });

  it("可空文本:空串/纯空白 → null,有值则 trim", () => {
    const r1 = workInputSchema.safeParse({
      ...base,
      summary: "   ",
      notes: "",
    });
    expect(r1.success && r1.data.summary).toBeNull();
    expect(r1.success && r1.data.notes).toBeNull();
    const r2 = workInputSchema.safeParse({ ...base, notes: "  备注 " });
    expect(r2.success && r2.data.notes).toBe("备注");
  });

  it("type / status 非法枚举被拒", () => {
    expect(workInputSchema.safeParse({ ...base, type: "xxx" }).success).toBe(
      false,
    );
    expect(workInputSchema.safeParse({ ...base, status: "未知" }).success).toBe(
      false,
    );
  });

  it("author_role:空 → null;非法 → 拒;合法枚举保留", () => {
    expect(
      workInputSchema.safeParse({ ...base, author_role: "" }).success &&
        workInputSchema.parse({ ...base, author_role: "" }).author_role,
    ).toBeNull();
    expect(
      workInputSchema.safeParse({ ...base, author_role: "助理" }).success,
    ).toBe(false);
    expect(
      workInputSchema.parse({ ...base, author_role: "第一作者" }).author_role,
    ).toBe("第一作者");
  });

  describe("word_count", () => {
    it("空串 → null", () => {
      expect(
        workInputSchema.parse({ ...base, word_count: "" }).word_count,
      ).toBeNull();
    });
    it("合法数字字符串被 coerce 为整数", () => {
      expect(
        workInputSchema.parse({ ...base, word_count: "12800" }).word_count,
      ).toBe(12800);
    });
    it("负数被拒", () => {
      expect(
        workInputSchema.safeParse({ ...base, word_count: "-1" }).success,
      ).toBe(false);
    });
    it("小数被拒(必须整数)", () => {
      expect(
        workInputSchema.safeParse({ ...base, word_count: "12.5" }).success,
      ).toBe(false);
    });
    it("非数字被拒", () => {
      expect(
        workInputSchema.safeParse({ ...base, word_count: "abc" }).success,
      ).toBe(false);
    });
  });

  describe("published_at 日历校验(P0-3)", () => {
    it("合法日期通过", () => {
      expect(
        workInputSchema.parse({ ...base, published_at: "2025-03-15" })
          .published_at,
      ).toBe("2025-03-15");
    });
    it("空串 → null", () => {
      expect(
        workInputSchema.parse({ ...base, published_at: "" }).published_at,
      ).toBeNull();
    });
    it("拒绝不存在的日历日 2024-02-30", () => {
      expect(
        workInputSchema.safeParse({ ...base, published_at: "2024-02-30" })
          .success,
      ).toBe(false);
    });
    it("拒绝非法月份 2024-13-01", () => {
      expect(
        workInputSchema.safeParse({ ...base, published_at: "2024-13-01" })
          .success,
      ).toBe(false);
    });
    it("拒绝月份 00 / 日 00", () => {
      expect(
        workInputSchema.safeParse({ ...base, published_at: "2024-00-10" })
          .success,
      ).toBe(false);
      expect(
        workInputSchema.safeParse({ ...base, published_at: "2024-05-00" })
          .success,
      ).toBe(false);
    });
    it("闰年 2024-02-29 通过,平年 2025-02-29 被拒", () => {
      expect(
        workInputSchema.safeParse({ ...base, published_at: "2024-02-29" })
          .success,
      ).toBe(true);
      expect(
        workInputSchema.safeParse({ ...base, published_at: "2025-02-29" })
          .success,
      ).toBe(false);
    });
    it("格式不符(2024/01/01、2024-1-1)被拒", () => {
      expect(
        workInputSchema.safeParse({ ...base, published_at: "2024/01/01" })
          .success,
      ).toBe(false);
      expect(
        workInputSchema.safeParse({ ...base, published_at: "2024-1-1" })
          .success,
      ).toBe(false);
    });
  });

  it("tagIds:接受 number 数组,非数字元素被拒", () => {
    expect(
      workInputSchema.parse({ ...base, tagIds: [1, 2, 3] }).tagIds,
    ).toEqual([1, 2, 3]);
    expect(workInputSchema.safeParse({ ...base, tagIds: ["a"] }).success).toBe(
      false,
    );
  });

  describe("文本长度上限(P3-12)", () => {
    it("summary:边界 10000 通过,超出被拒", () => {
      expect(
        workInputSchema.safeParse({ ...base, summary: "字".repeat(10000) })
          .success,
      ).toBe(true);
      expect(
        workInputSchema.safeParse({ ...base, summary: "字".repeat(10001) })
          .success,
      ).toBe(false);
    });
    it("notes:边界 5000 通过,超出被拒", () => {
      expect(
        workInputSchema.safeParse({ ...base, notes: "字".repeat(5000) })
          .success,
      ).toBe(true);
      expect(
        workInputSchema.safeParse({ ...base, notes: "字".repeat(5001) })
          .success,
      ).toBe(false);
    });
    it("file_path:边界 500 通过,超出被拒", () => {
      expect(
        workInputSchema.safeParse({ ...base, file_path: "a".repeat(500) })
          .success,
      ).toBe(true);
      expect(
        workInputSchema.safeParse({ ...base, file_path: "a".repeat(501) })
          .success,
      ).toBe(false);
    });
    it("空值不受长度约束(纯空白仍 → null)", () => {
      expect(
        workInputSchema.parse({ ...base, summary: "   " }).summary,
      ).toBeNull();
    });
  });
});

describe("projectInputSchema", () => {
  const base = {
    title: "项目",
    level: "国家级",
    role: "主持",
    status: "已立项",
  };

  it("最小合法输入", () => {
    const r = projectInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.start_date).toBeNull();
      expect(r.data.end_date).toBeNull();
      expect(r.data.tagIds).toEqual([]);
    }
  });

  it("level / role / status 枚举校验", () => {
    expect(
      projectInputSchema.safeParse({ ...base, level: "宇宙级" }).success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse({ ...base, role: "围观" }).success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse({ ...base, status: "搁置" }).success,
    ).toBe(false);
  });

  it("起止日期沿用日历校验", () => {
    expect(
      projectInputSchema.safeParse({ ...base, start_date: "2024-02-30" })
        .success,
    ).toBe(false);
    expect(
      projectInputSchema.parse({
        ...base,
        start_date: "2023-01-01",
        end_date: "2025-12-31",
      }).end_date,
    ).toBe("2025-12-31");
  });

  it("notes 超 5000 字被拒,边界 5000 通过(P3-12)", () => {
    expect(
      projectInputSchema.safeParse({ ...base, notes: "字".repeat(5000) })
        .success,
    ).toBe(true);
    expect(
      projectInputSchema.safeParse({ ...base, notes: "字".repeat(5001) })
        .success,
    ).toBe(false);
  });

  describe("跨字段:结束日期不得早于开始日期", () => {
    it("end < start 被拒,错误挂在 end_date 字段", () => {
      const r = projectInputSchema.safeParse({
        ...base,
        start_date: "2025-01-02",
        end_date: "2025-01-01",
      });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(
          r.error.issues.some(
            (i) =>
              i.path.includes("end_date") &&
              i.message === "结束日期不能早于开始日期",
          ),
        ).toBe(true);
      }
    });
    it("end == start 通过(同日合法)", () => {
      expect(
        projectInputSchema.safeParse({
          ...base,
          start_date: "2025-01-01",
          end_date: "2025-01-01",
        }).success,
      ).toBe(true);
    });
    it("end > start 通过", () => {
      expect(
        projectInputSchema.safeParse({
          ...base,
          start_date: "2023-01-01",
          end_date: "2025-12-31",
        }).success,
      ).toBe(true);
    });
    it("仅一端有值不触发跨字段校验", () => {
      expect(
        projectInputSchema.safeParse({ ...base, start_date: "2025-06-01" })
          .success,
      ).toBe(true);
      expect(
        projectInputSchema.safeParse({ ...base, end_date: "2025-06-01" })
          .success,
      ).toBe(true);
    });
  });
});

describe("submissionInputSchema", () => {
  const base = {
    journal: "民族研究",
    round: 1,
    status: "在审",
    submitted_at: "2025-09-10",
  };

  it("最小合法输入", () => {
    const r = submissionInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.decided_at).toBeNull();
      expect(r.data.review_notes).toBeNull();
    }
  });

  it("journal 空白被拒", () => {
    expect(
      submissionInputSchema.safeParse({ ...base, journal: "  " }).success,
    ).toBe(false);
  });

  describe("round", () => {
    it("数字字符串被 coerce", () => {
      expect(submissionInputSchema.parse({ ...base, round: "2" }).round).toBe(
        2,
      );
    });
    it("0 / 负数被拒(至少为 1)", () => {
      expect(
        submissionInputSchema.safeParse({ ...base, round: 0 }).success,
      ).toBe(false);
      expect(
        submissionInputSchema.safeParse({ ...base, round: -1 }).success,
      ).toBe(false);
    });
    it("小数被拒", () => {
      expect(
        submissionInputSchema.safeParse({ ...base, round: 1.5 }).success,
      ).toBe(false);
    });
    it("空串被拒", () => {
      expect(
        submissionInputSchema.safeParse({ ...base, round: "" }).success,
      ).toBe(false);
    });
  });

  it("submitted_at 必填且需合法日历日", () => {
    expect(
      submissionInputSchema.safeParse({ ...base, submitted_at: "" }).success,
    ).toBe(false);
    expect(
      submissionInputSchema.safeParse({ ...base, submitted_at: "2025-02-30" })
        .success,
    ).toBe(false);
  });

  it("decided_at 可空:空串 → null", () => {
    expect(
      submissionInputSchema.parse({ ...base, decided_at: "" }).decided_at,
    ).toBeNull();
    expect(
      submissionInputSchema.parse({ ...base, decided_at: "2025-11-28" })
        .decided_at,
    ).toBe("2025-11-28");
  });

  it("status 枚举校验", () => {
    expect(
      submissionInputSchema.safeParse({ ...base, status: "待定" }).success,
    ).toBe(false);
  });

  describe("跨字段:决定日期不得早于投稿日期", () => {
    it("decided < submitted 被拒,错误挂在 decided_at 字段", () => {
      const r = submissionInputSchema.safeParse({
        ...base,
        submitted_at: "2025-09-10",
        decided_at: "2025-09-09",
      });
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(
          r.error.issues.some(
            (i) =>
              i.path.includes("decided_at") &&
              i.message === "决定日期不能早于投稿日期",
          ),
        ).toBe(true);
      }
    });
    it("decided == submitted 通过(同日合法)", () => {
      expect(
        submissionInputSchema.safeParse({
          ...base,
          submitted_at: "2025-09-10",
          decided_at: "2025-09-10",
        }).success,
      ).toBe(true);
    });
    it("decided > submitted 通过", () => {
      expect(
        submissionInputSchema.safeParse({
          ...base,
          submitted_at: "2025-09-10",
          decided_at: "2025-11-28",
        }).success,
      ).toBe(true);
    });
    it("decided 为空 / 空串不触发跨字段校验", () => {
      expect(
        submissionInputSchema.safeParse({ ...base, decided_at: "" }).success,
      ).toBe(true);
    });
  });
});
