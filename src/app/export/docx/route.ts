// 成果清单 Word(.docx)下载 —— v1.0(Route Handler)
//
// GET /export/docx → application/vnd.openxmlformats .docx 附件。
// 复用导出查询数据,生成「研究成果(按年)+ 科研项目(含挂接成果)」的 Word 清单。
import {
  getAllWorksForExport,
  getProjectsWithOutputs,
} from "@/db/queries/export";
import { buildAchievementsDocx, packDocx } from "@/lib/docx-report";

export const dynamic = "force-dynamic";

export async function GET() {
  const [works, projects] = await Promise.all([
    getAllWorksForExport(),
    getProjectsWithOutputs(),
  ]);
  const buffer = await packDocx(buildAchievementsDocx(works, projects));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition":
        'attachment; filename="academic-achievements.docx"',
    },
  });
}
