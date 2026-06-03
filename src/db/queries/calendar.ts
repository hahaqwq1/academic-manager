// 截止提醒日历事件 —— v0.4
//
// 汇集两类需要「到点提醒」的日期,转成 .ics 全天事件:
//   - 投稿超期:submitted_at + OVERDUE_DAYS(在审未决的投稿,该日仍无果即超期)。
//   - 项目结题:end_date(临近结题 / 结题中且有结束日期的项目)。
// 复用 listPendingSubmissions / getClosingProjects,不另写查询。
import { OVERDUE_DAYS } from "@/lib/constants";
import { DAY_MS, parseDateOnly } from "@/lib/format";
import type { IcsEvent } from "@/lib/ics";

import { getClosingProjects } from "./dashboard";
import { listPendingSubmissions } from "./submissions";

// 在 YYYY-MM-DD 上加 days 天,返回 YYYY-MM-DD;非法日期返回 null。
function addDays(date: string, days: number): string | null {
  const d = parseDateOnly(date);
  if (!d) return null;
  const t = new Date(d.getTime() + days * DAY_MS);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const day = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getDeadlineEvents(): Promise<IcsEvent[]> {
  const events: IcsEvent[] = [];

  const pending = await listPendingSubmissions();
  for (const s of pending) {
    const due = addDays(s.submitted_at, OVERDUE_DAYS);
    if (!due) continue;
    events.push({
      uid: `submission-${s.id}@academic-manager`,
      date: due,
      summary: `投稿超期提醒:《${s.work_title}》@ ${s.journal}`,
      description: `第 ${s.round} 轮,投于 ${s.submitted_at};超过 ${OVERDUE_DAYS} 天仍未出结果。`,
    });
  }

  const closing = await getClosingProjects();
  for (const p of closing) {
    if (!p.end_date) continue;
    events.push({
      uid: `project-${p.id}@academic-manager`,
      date: p.end_date,
      summary: `项目结题:${p.title}`,
      description: `状态:${p.status}。`,
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}
