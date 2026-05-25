import { StudyPlanWorkspace } from "@/components/study-plan-workspace";
import { Card, Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudyPlansPage() {
  const user = await requireUser();
  const [students, plans] = user.storeId
    ? await Promise.all([
        prisma.student.findMany({
          where: { storeId: user.storeId, status: "active" },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, grade: true, weakSubjects: true, weakPoints: true },
        }),
        prisma.studyPlan.findMany({
          where: { storeId: user.storeId },
          include: { student: { select: { id: true, name: true, grade: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ])
    : [[], []];
  const isOwner = user.role === "store_owner";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">AI学习计划</h1>
        <p className="mt-1 text-sm text-slate-500">
          基于数学、物理、化学和学术英语错题生成具体任务；英语训练强调正式表达、语法精确性和阅读证据定位。
        </p>
      </div>
      {isOwner ? (
        <Card title="学习计划记录">
          {plans.length === 0 ? (
            <Empty>暂无学习计划记录。计划生成由督学在员工端完成。</Empty>
          ) : (
            <div className="grid gap-3">
              {plans.map((item) => (
                <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-950">
                      {item.student.name} · {item.planType} · {item.availableMinutes}分钟
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(item.createdAt)}</div>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-slate-700">{item.content}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <StudyPlanWorkspace students={JSON.parse(JSON.stringify(students))} plans={JSON.parse(JSON.stringify(plans))} />
      )}
    </div>
  );
}
