import { DailyReportWorkspace } from "@/components/daily-report-workspace";
import { Card, Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DailyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string | string[] }>;
}) {
  const user = await requireUser();
  const isOwner = user.role === "store_owner";
  const query = await searchParams;
  const defaultStudentId = Array.isArray(query.studentId) ? query.studentId[0] : query.studentId;
  const [students, reports, wrongQuestions] = user.storeId
    ? await Promise.all([
        prisma.student.findMany({
          where: { storeId: user.storeId, status: "active" },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, grade: true, parentName: true },
        }),
        prisma.dailyReport.findMany({
          where: { storeId: user.storeId },
          include: { student: { select: { id: true, name: true, grade: true, parentName: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.wrongQuestion.findMany({
          where: { storeId: user.storeId, masteryStatus: { in: ["not_mastered", "reviewing", "focus"] } },
          include: { student: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 80,
        }),
      ])
    : [[], [], []];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">AI学习反馈</h1>
        <p className="mt-1 text-sm text-slate-500">员工填写少量学习事实，系统生成温和、具体、可直接发微信的家长反馈；英语反馈保持正式学术训练口径。</p>
      </div>
      {isOwner ? (
        <Card title="家长反馈记录">
          {reports.length === 0 ? (
            <Empty>暂无家长反馈记录。日报生成与复制发送由督学在员工端完成。</Empty>
          ) : (
            <div className="grid gap-3">
              {reports.map((item) => (
                <div key={item.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-950">
                      {item.student.name} · {formatDate(item.reportDate)} · 已复制 {item.copiedCount} 次
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
        <DailyReportWorkspace
          students={JSON.parse(JSON.stringify(students))}
          reports={JSON.parse(JSON.stringify(reports))}
          wrongQuestions={JSON.parse(JSON.stringify(wrongQuestions))}
          defaultSelectedStudentId={defaultStudentId}
        />
      )}
    </div>
  );
}
