import { WorkflowBoard } from "@/components/workflow-board";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WorkflowPage() {
  const user = await requireUser();
  if (user.role === "store_owner") {
    return (
      <Card title="今日督学属于员工端">
        <div className="text-sm leading-7 text-slate-600">
          老板端不处理上传错题、生成计划和生成家长日报等一线操作。请使用员工账号进入今日督学工作台。
        </div>
      </Card>
    );
  }
  const [students, wrongQuestions] = user.storeId
    ? await Promise.all([
        prisma.student.findMany({
          where: { storeId: user.storeId, status: "active" },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, grade: true, parentName: true, weakPoints: true },
        }),
        prisma.wrongQuestion.findMany({
          where: { storeId: user.storeId, masteryStatus: { in: ["not_mastered", "reviewing", "focus"] } },
          include: { student: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      ])
    : [[], []];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">今日督学</h1>
        <p className="mt-1 text-sm text-slate-500">一个页面完成选学生、看错题、生成学习计划和家长日报。</p>
      </div>
      <WorkflowBoard students={JSON.parse(JSON.stringify(students))} wrongQuestions={JSON.parse(JSON.stringify(wrongQuestions))} />
    </div>
  );
}
