// 投稿查询 —— Phase 4
//
// listSubmissionsForWork:某作品的全部投稿轮次,按 round 升序(用于作品详情内管理)。
// listPendingSubmissions:全局「在投」视图数据 —— 所有「在审且未出结果(decided_at 为空)」
//   的投稿,联表带出作品标题/类型,计算已历天数与是否超期(> OVERDUE_DAYS)。
//   排序:超期者优先,其次按已历天数倒序(越久越靠前)。
import { eq, asc, isNull, and } from "drizzle-orm";

import { db } from "@/db";
import { submissions, works } from "@/db/schema";
import type { Submission } from "@/db/schema";
import { OVERDUE_DAYS } from "@/lib/constants";

const DAY_MS = 24 * 60 * 60 * 1000;

// 把 YYYY-MM-DD 解析为本地零点 Date;非法返回 null。
function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

// 今天的本地零点。
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function listSubmissionsForWork(
  workId: number
): Promise<Submission[]> {
  return db
    .select()
    .from(submissions)
    .where(eq(submissions.work_id, workId))
    .orderBy(asc(submissions.round))
    .all();
}

// 全局在投条目:投稿字段 + 作品信息 + 已历天数 / 是否超期。
export interface PendingSubmission {
  id: number;
  work_id: number;
  work_title: string;
  work_type: string;
  journal: string;
  round: number;
  status: string;
  submitted_at: string;
  review_notes: string | null;
  daysElapsed: number;
  isOverdue: boolean;
}

export async function listPendingSubmissions(): Promise<PendingSubmission[]> {
  const rows = db
    .select({
      id: submissions.id,
      work_id: submissions.work_id,
      work_title: works.title,
      work_type: works.type,
      journal: submissions.journal,
      round: submissions.round,
      status: submissions.status,
      submitted_at: submissions.submitted_at,
      review_notes: submissions.review_notes,
    })
    .from(submissions)
    .innerJoin(works, eq(submissions.work_id, works.id))
    .where(and(eq(submissions.status, "在审"), isNull(submissions.decided_at)))
    .all();

  const today = startOfToday();

  const enriched = rows.map((r) => {
    const submitted = parseDateOnly(r.submitted_at);
    const daysElapsed = submitted
      ? Math.max(0, Math.floor((today.getTime() - submitted.getTime()) / DAY_MS))
      : 0;
    return {
      ...r,
      daysElapsed,
      isOverdue: daysElapsed > OVERDUE_DAYS,
    };
  });

  // 超期优先,其次按已历天数倒序。
  enriched.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return b.daysElapsed - a.daysElapsed;
  });

  return enriched;
}
