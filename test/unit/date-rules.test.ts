// 共享日期规则单测 —— 升级线(共享校验模块)
//
// date-rules.ts 是表单(validations.ts)与导入恢复(actions/export.ts)共享的「单一真源」。
// 此处直接钉死谓词与参数对象,确保任何一侧改了规则/文案都会被这里以及两侧的端到端测试同时发现。
import { describe, expect, it } from "vitest";

import {
  DATE_FORMAT_MESSAGE,
  DATE_FORMAT_REGEX,
  DATE_INVALID_MESSAGE,
  isProjectDateOrderValid,
  isRealCalendarDate,
  isSubmissionDateOrderValid,
  PROJECT_DATE_ORDER_MESSAGE,
  projectDateOrderRefineParams,
  SUBMISSION_DATE_ORDER_MESSAGE,
  submissionDateOrderRefineParams,
} from "@/lib/date-rules";

describe("isRealCalendarDate(委托 parseDateOnly 的真实日历日校验)", () => {
  it("接受真实日历日", () => {
    expect(isRealCalendarDate("2024-02-29")).toBe(true); // 闰年
    expect(isRealCalendarDate("2024-12-31")).toBe(true);
  });
  it("拒绝被 JS 静默滚动的非法日历日与越界月/日", () => {
    expect(isRealCalendarDate("2024-02-30")).toBe(false);
    expect(isRealCalendarDate("2025-02-29")).toBe(false); // 平年
    expect(isRealCalendarDate("2024-13-01")).toBe(false);
    expect(isRealCalendarDate("2024-00-10")).toBe(false);
    expect(isRealCalendarDate("2024-05-00")).toBe(false);
  });
  it("格式正则只认 YYYY-MM-DD", () => {
    expect(DATE_FORMAT_REGEX.test("2024-05-01")).toBe(true);
    expect(DATE_FORMAT_REGEX.test("2024-5-1")).toBe(false);
    expect(DATE_FORMAT_REGEX.test("2024/05/01")).toBe(false);
  });
});

describe("isProjectDateOrderValid(结束日期不得早于开始日期)", () => {
  it("两端都填时按字典序=时间序比较", () => {
    expect(
      isProjectDateOrderValid({
        start_date: "2024-01-01",
        end_date: "2024-12-31",
      }),
    ).toBe(true);
    expect(
      isProjectDateOrderValid({
        start_date: "2024-01-01",
        end_date: "2024-01-01",
      }),
    ).toBe(true); // 等值允许
    expect(
      isProjectDateOrderValid({
        start_date: "2024-12-31",
        end_date: "2024-01-01",
      }),
    ).toBe(false);
  });
  it("任一端为空 / null 时跳过校验(视为合法)", () => {
    expect(
      isProjectDateOrderValid({ start_date: "2024-01-01", end_date: null }),
    ).toBe(true);
    expect(
      isProjectDateOrderValid({ start_date: null, end_date: "2024-01-01" }),
    ).toBe(true);
    expect(isProjectDateOrderValid({ start_date: null, end_date: null })).toBe(
      true,
    );
  });
  it("refine 参数挂载在 end_date 字段并带统一文案", () => {
    expect(projectDateOrderRefineParams).toMatchObject({
      path: ["end_date"],
      message: PROJECT_DATE_ORDER_MESSAGE,
    });
    expect(PROJECT_DATE_ORDER_MESSAGE).toBe("结束日期不能早于开始日期");
  });
});

describe("isSubmissionDateOrderValid(决定日期不得早于投稿日期)", () => {
  it("decided_at 填了才校验", () => {
    expect(
      isSubmissionDateOrderValid({
        submitted_at: "2024-01-01",
        decided_at: "2024-02-01",
      }),
    ).toBe(true);
    expect(
      isSubmissionDateOrderValid({
        submitted_at: "2024-01-01",
        decided_at: "2024-01-01",
      }),
    ).toBe(true); // 等值允许
    expect(
      isSubmissionDateOrderValid({
        submitted_at: "2024-02-01",
        decided_at: "2024-01-01",
      }),
    ).toBe(false);
  });
  it("decided_at 为空 / null 时跳过校验(尚在审)", () => {
    expect(
      isSubmissionDateOrderValid({
        submitted_at: "2024-01-01",
        decided_at: null,
      }),
    ).toBe(true);
    expect(isSubmissionDateOrderValid({ submitted_at: "2024-01-01" })).toBe(
      true,
    );
  });
  it("refine 参数挂载在 decided_at 字段并带统一文案", () => {
    expect(submissionDateOrderRefineParams).toMatchObject({
      path: ["decided_at"],
      message: SUBMISSION_DATE_ORDER_MESSAGE,
    });
    expect(SUBMISSION_DATE_ORDER_MESSAGE).toBe("决定日期不能早于投稿日期");
  });
});

// 文案常量自身钉死,避免被无意改动后两侧端到端断言一起飘。
describe("文案常量", () => {
  it("格式 / 非法日期文案", () => {
    expect(DATE_FORMAT_MESSAGE).toBe("日期格式应为 YYYY-MM-DD");
    expect(DATE_INVALID_MESSAGE).toBe("日期无效,请检查月份与日期");
  });
});
