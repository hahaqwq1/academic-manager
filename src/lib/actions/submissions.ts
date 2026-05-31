"use server";

// 投稿 Server Actions —— Phase 4
//
// 投稿轮次依附于某作品,在作品详情页内管理(增 / 改 / 删),不单独建页、不 redirect。
// 约定:
// - 校验失败返回 { ok:false, errors, message }。
// - 成功后 revalidatePath 作品详情 / 在投视图 / 看板,由 client 端 router.refresh 反映。
// - submissions 通过外键 onDelete:cascade 依附 works;删除作品时自动级联,这里只管单条轮次。
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { submissions } from "@/db/schema";
import { submissionInputSchema } from "@/lib/validations";

export type SubmissionActionState = {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
};

function toFieldErrors(
  issues: { path: PropertyKey[]; message: string }[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (key === undefined) continue;
    const name = String(key);
    if (!(name in errors)) errors[name] = issue.message;
  }
  return errors;
}

// 投稿动作完成后统一刷新的路径。
function revalidateAll(workId: number) {
  revalidatePath(`/works/${workId}`);
  revalidatePath("/submissions");
  revalidatePath("/");
}

// 新增一条投稿轮次。
export async function createSubmission(
  workId: number,
  input: unknown
): Promise<SubmissionActionState> {
  const parsed = submissionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: toFieldErrors(parsed.error.issues),
      message: "请检查表单",
    };
  }

  const data = parsed.data;
  try {
    db.insert(submissions)
      .values({
        work_id: workId,
        journal: data.journal,
        round: data.round,
        status: data.status,
        submitted_at: data.submitted_at,
        decided_at: data.decided_at,
        review_notes: data.review_notes,
      })
      .run();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "保存失败,请重试",
    };
  }

  revalidateAll(workId);
  return { ok: true };
}

// 更新一条投稿轮次。
export async function updateSubmission(
  workId: number,
  submissionId: number,
  input: unknown
): Promise<SubmissionActionState> {
  const parsed = submissionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: toFieldErrors(parsed.error.issues),
      message: "请检查表单",
    };
  }

  const data = parsed.data;
  try {
    db.update(submissions)
      .set({
        journal: data.journal,
        round: data.round,
        status: data.status,
        submitted_at: data.submitted_at,
        decided_at: data.decided_at,
        review_notes: data.review_notes,
      })
      .where(
        and(eq(submissions.id, submissionId), eq(submissions.work_id, workId))
      )
      .run();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "保存失败,请重试",
    };
  }

  revalidateAll(workId);
  return { ok: true };
}

// 删除一条投稿轮次。
export async function deleteSubmission(
  workId: number,
  submissionId: number
): Promise<{ ok: boolean; message?: string }> {
  try {
    db.delete(submissions)
      .where(
        and(eq(submissions.id, submissionId), eq(submissions.work_id, workId))
      )
      .run();
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "删除失败,请重试",
    };
  }

  revalidateAll(workId);
  return { ok: true };
}
