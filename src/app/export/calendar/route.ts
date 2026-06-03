// .ics 截止日历下载 —— v0.4(Route Handler)
//
// GET /export/calendar → text/calendar 附件下载。汇集投稿超期 / 项目结题截止为全天事件,
// 用户拖进系统日历由其负责到点提醒(单机本地无后台进程,做不了主动推送)。
import { getDeadlineEvents } from "@/db/queries/calendar";
import { buildIcs } from "@/lib/ics";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = await getDeadlineEvents();
  const ics = buildIcs(events, { calName: "学术资料库 · 截止提醒" });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="academic-deadlines.ics"',
    },
  });
}
