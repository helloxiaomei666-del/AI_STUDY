import Link from "next/link";
import { BookOpenCheck, ClipboardList, MessageSquareText, Sparkles, UserPlus } from "lucide-react";
import { Card, Empty, LinkButton, Stat } from "@/components/ui";
import { formatDate, getCurrentMonthKey, quotaPercent } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { promptFeatureLabels } from "@/lib/prompt-requirements";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const storeId = user.storeId;
  const isOwner = user.role === "store_owner";

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [
    students,
    wrongToday,
    plansToday,
    reportsToday,
    quota,
    dueWrongQuestions,
    weakPoints,
    studentsNeedReport,
    recentUsageLogs,
  ] = storeId
    ? await Promise.all([
        prisma.student.count({ where: { storeId, status: "active" } }),
        prisma.wrongQuestion.count({ where: { storeId, createdAt: { gte: start } } }),
        prisma.studyPlan.count({ where: { storeId, createdAt: { gte: start } } }),
        prisma.dailyReport.count({ where: { storeId, createdAt: { gte: start } } }),
        prisma.storeQuota.findUnique({ where: { storeId_month: { storeId, month: getCurrentMonthKey() } } }),
        prisma.wrongQuestion.findMany({
          where: {
            storeId,
            masteryStatus: { in: ["not_mastered", "reviewing", "focus"] },
            OR: [{ nextReviewDate: { lte: new Date() } }, { masteryStatus: "focus" }],
          },
          include: { student: { select: { id: true, name: true, grade: true } } },
          orderBy: [{ masteryStatus: "asc" }, { nextReviewDate: "asc" }],
          take: 8,
        }),
        prisma.wrongQuestion.groupBy({
          by: ["knowledgePoint"],
          where: {
            storeId,
            knowledgePoint: { not: "" },
            masteryStatus: { in: ["not_mastered", "reviewing", "focus"] },
          },
          _count: { knowledgePoint: true },
          orderBy: { _count: { knowledgePoint: "desc" } },
          take: 8,
        }),
        prisma.student.findMany({
          where: {
            storeId,
            status: "active",
            dailyReports: { none: { reportDate: start } },
          },
          select: {
            id: true,
            name: true,
            grade: true,
            assignedUser: { select: { name: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
        }),
        prisma.aiUsageLog.findMany({
          where: { storeId },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
      ])
    : [0, 0, 0, 0, null, [], [], [], []];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">{isOwner ? "门店经营看板" : "工作台"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isOwner
            ? "老板端聚焦经营概览、员工工作量、家长反馈和AI额度，不处理一线督学操作。"
            : "围绕学生档案、错题分析、学习计划和家长日报完成日常督学闭环。"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Stat label="学生数" value={students} hint="当前门店活跃学生" />
        <Stat label="今日错题分析" value={wrongToday} hint="已扣减错题额度" />
        <Stat label="今日学习计划" value={plansToday} hint="已扣减计划额度" />
        <Stat label="今日日报" value={reportsToday} hint="已扣减日报额度" />
        <Stat label="待发日报" value={studentsNeedReport.length} hint="今日未生成家长反馈" />
      </div>

      <Card
        title="产品亮点：AI主动学习"
        action={<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">提问力训练</span>}
        className="border-emerald-200 bg-emerald-50/60"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="text-sm leading-7 text-slate-700">
            <div className="flex items-center gap-2 font-medium text-slate-950">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              让学生在探索新主题时，学习如何向AI提出好问题。
            </div>
            <p className="mt-2">
              适合高中专业探索、新技能入门和兴趣拓展。系统会生成入门地图、评价问题质量、给出更好的问法和追问建议，最后沉淀为督学观察报告。
            </p>
          </div>
          <LinkButton href="/students" className="bg-emerald-800 hover:bg-emerald-900">
            查看学生端入口
          </LinkButton>
        </div>
      </Card>

      {!isOwner && (
        <Card title="快捷操作">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <LinkButton href="/students">
              <UserPlus className="h-4 w-4" />
              新增学生
            </LinkButton>
            <LinkButton href="/wrong-questions">
              <BookOpenCheck className="h-4 w-4" />
              上传错题
            </LinkButton>
            <LinkButton href="/study-plans">
              <ClipboardList className="h-4 w-4" />
              生成计划
            </LinkButton>
            <LinkButton href="/daily-reports">
              <MessageSquareText className="h-4 w-4" />
              生成日报
            </LinkButton>
          </div>
        </Card>
      )}

      {quota && (
        <Card title="本月AI额度">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["错题分析", quota.wrongQuestionUsed, quota.wrongQuestionQuota],
              ["学习计划", quota.studyPlanUsed, quota.studyPlanQuota],
              ["家长日报", quota.dailyReportUsed, quota.dailyReportQuota],
            ].map(([label, used, total]) => (
              <div key={String(label)} className="rounded-md bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{label}</span>
                  <span className="text-slate-500">
                    {used}/{total}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-emerald-700" style={{ width: `${quotaPercent(Number(used), Number(total))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card title="今日待反馈学生">
          {studentsNeedReport.length === 0 ? (
            <Empty>今日活跃学生都已经生成过家长日报。</Empty>
          ) : (
            <div className="grid gap-2">
              {studentsNeedReport.map((student) => (
                <Link
                  key={student.id}
                  href={`/daily-reports?studentId=${student.id}`}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <span className="font-medium text-slate-900">
                    {student.name} · {student.grade}
                  </span>
                  <span className="text-xs text-slate-500">{student.assignedUser?.name || "未分配督学"}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="最近AI服务记录">
          {recentUsageLogs.length === 0 ? (
            <Empty>暂无AI调用记录。</Empty>
          ) : (
            <div className="grid gap-2">
              {recentUsageLogs.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{promptFeatureLabels[item.featureType]}</div>
                    <div className="text-xs text-slate-500">
                      {item.user?.name || "系统"} · {item.modelName}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{formatDate(item.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="今日复习提醒">
          {dueWrongQuestions.length === 0 ? (
            <Empty>暂无到期错题。可以从错题本中继续标记需要重点关注的题目。</Empty>
          ) : (
            <div className="grid gap-3">
              {dueWrongQuestions.map((item) => (
                <Link
                  key={item.id}
                  href="/wrong-questions"
                  className="rounded-md border border-slate-200 p-3 text-sm hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-950">
                      {item.student.name} · {item.subject} · {item.knowledgePoint || "未标注知识点"}
                    </div>
                    <div className="text-xs text-slate-500">复习日：{formatDate(item.nextReviewDate)}</div>
                  </div>
                  <div className="mt-1 line-clamp-2 text-slate-600">{item.reviewSuggestion || item.aiAnalysis}</div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="薄弱知识点排行">
          {weakPoints.length === 0 ? (
            <Empty>暂无薄弱点数据</Empty>
          ) : (
            <div className="grid gap-3">
              {weakPoints.map((item) => (
                <div key={item.knowledgePoint || "unknown"} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-800">{item.knowledgePoint}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{item._count.knowledgePoint} 道</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
