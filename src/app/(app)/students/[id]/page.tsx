import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyStudentPortalLink } from "@/components/copy-student-portal-link";
import { StudentDetailActions } from "@/components/student-detail-actions";
import { Card, Empty } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureStudentAccessToken } from "@/lib/student-access";

export const dynamic = "force-dynamic";

const activeMastery = new Set(["not_mastered", "reviewing", "focus"]);

function masteryLabel(status: string) {
  const labels: Record<string, string> = {
    not_mastered: "未掌握",
    reviewing: "复习中",
    mastered: "已掌握",
    focus: "重点关注",
  };
  return labels[status] || status;
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!user.storeId) notFound();
  const isOwner = user.role === "store_owner";
  const student = await prisma.student.findFirst({
    where: { id, storeId: user.storeId },
    include: {
      wrongQuestions: { orderBy: { createdAt: "desc" }, take: 80 },
      studyPlans: { orderBy: { createdAt: "desc" }, take: 5 },
      dailyReports: { orderBy: { createdAt: "desc" }, take: 5 },
      aiInteractions: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!student) notFound();
  const accessToken = await ensureStudentAccessToken(student.id, user.storeId);
  const studentPortalPath = `/student/${accessToken.token}`;

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const dueReviews = student.wrongQuestions
    .filter((item) => {
      const isActive = activeMastery.has(item.masteryStatus);
      const isDue = item.nextReviewDate ? item.nextReviewDate <= today : item.masteryStatus === "focus";
      return isActive && isDue;
    })
    .slice(0, 6);
  const activeWrongQuestions = student.wrongQuestions.filter((item) => activeMastery.has(item.masteryStatus));
  const weakPointRows = Array.from(
    student.wrongQuestions
      .filter((item) => activeMastery.has(item.masteryStatus) && item.knowledgePoint)
      .reduce((map, item) => {
        const key = `${item.subject}｜${item.knowledgePoint}`;
        const current = map.get(key) || { subject: item.subject, knowledgePoint: item.knowledgePoint || "", count: 0 };
        current.count += 1;
        map.set(key, current);
        return map;
      }, new Map<string, { subject: string; knowledgePoint: string; count: number }>())
      .values(),
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const subjectRows = Array.from(
    student.wrongQuestions
      .reduce((map, item) => {
        const current = map.get(item.subject) || { subject: item.subject, total: 0, active: 0, mastered: 0 };
        current.total += 1;
        if (item.masteryStatus === "mastered") current.mastered += 1;
        if (activeMastery.has(item.masteryStatus)) current.active += 1;
        map.set(item.subject, current);
        return map;
      }, new Map<string, { subject: string; total: number; active: number; mastered: number }>())
      .values(),
  ).sort((a, b) => b.active - a.active || b.total - a.total);
  const latestReviewSuggestion = student.wrongQuestions.find((item) => item.reviewSuggestion)?.reviewSuggestion;

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/students" className="text-sm text-emerald-700 hover:text-emerald-900">
          返回学生列表
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">{student.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {student.grade} · {student.mainSubjects || "未填写主要科目"}
        </p>
      </div>

      <StudentDetailActions student={JSON.parse(JSON.stringify(student))} readOnly={isOwner} />

      <Card title="学生AI学习端">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm leading-7 text-slate-700">
              {isOwner
                ? "老板端可查看学生端学习入口和最近交互记录。日常发链接、上传错题、生成计划与日报由督学执行。"
                : "把这个链接或二维码发给学生。学生无需登录后台，只能查看自己的学习计划、上传错题、获取分步提示并标记掌握状态。"}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={studentPortalPath}
                className="mt-3 inline-flex h-10 items-center rounded-md bg-emerald-700 px-3 text-sm font-medium text-white hover:bg-emerald-800"
              >
                打开学生端
              </Link>
              <CopyStudentPortalLink path={studentPortalPath} />
            </div>
            <Link
              href={studentPortalPath}
              className="mt-3 block break-all rounded-md bg-slate-50 p-3 text-xs text-emerald-700 hover:bg-emerald-50"
            >
              {studentPortalPath}
            </Link>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="text-sm font-medium text-slate-950">最近学生AI动作</div>
            {student.aiInteractions.length === 0 ? (
              <div className="mt-3 text-sm text-slate-500">暂无学生端交互记录</div>
            ) : (
              <div className="mt-3 grid gap-2">
                {student.aiInteractions.map((item) => (
                  <div key={item.id} className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <div className="font-medium text-slate-900">{item.interactionType}</div>
                    <div>{formatDate(item.createdAt)}</div>
                    {item.content && <div className="mt-1 line-clamp-2">{item.content}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="错题总数">
          <div className="text-3xl font-semibold text-slate-950">{student.wrongQuestions.length}</div>
          <p className="mt-2 text-xs text-slate-500">最近80条错题记录</p>
        </Card>
        <Card title="待复习">
          <div className="text-3xl font-semibold text-amber-700">{dueReviews.length}</div>
          <p className="mt-2 text-xs text-slate-500">到期或重点关注</p>
        </Card>
        <Card title="未掌握">
          <div className="text-3xl font-semibold text-rose-700">{activeWrongQuestions.length}</div>
          <p className="mt-2 text-xs text-slate-500">未掌握 / 复习中 / 重点关注</p>
        </Card>
        <Card title="已掌握">
          <div className="text-3xl font-semibold text-emerald-700">
            {student.wrongQuestions.filter((item) => item.masteryStatus === "mastered").length}
          </div>
          <p className="mt-2 text-xs text-slate-500">可作为复盘完成记录</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card
          title="今日待复习"
          action={
            !isOwner &&
            <Link href="/workflow" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
              去今日督学
            </Link>
          }
        >
          {dueReviews.length === 0 ? (
            <Empty>暂无到期错题。可以从历史错题中选择重点关注，或先生成新的错题分析。</Empty>
          ) : (
            <div className="grid gap-3">
              {dueReviews.map((item) => (
                <Link
                  key={item.id}
                  href={`/wrong-questions/${item.id}`}
                  className="rounded-md border border-slate-100 p-3 text-sm hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-slate-950">
                      {item.subject} · {item.knowledgePoint || "未标注知识点"}
                    </div>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">{masteryLabel(item.masteryStatus)}</span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-slate-600">{item.reviewSuggestion || item.aiAnalysis}</div>
                  <div className="mt-2 text-xs text-slate-400">复习日：{formatDate(item.nextReviewDate)}</div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="下一步建议">
          <div className="grid gap-3 text-sm leading-7 text-slate-700">
            <p>{latestReviewSuggestion || student.remark || "建议先补充错题分析，系统会根据错题自动沉淀薄弱点和复习建议。"}</p>
            {!isOwner && <div className="flex flex-wrap gap-2">
              <Link href="/wrong-questions" className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">
                上传错题
              </Link>
              <Link href="/study-plans" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
                生成计划
              </Link>
              <Link href="/daily-reports" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
                生成日报
              </Link>
            </div>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="学习档案">
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-slate-500">目标</dt>
              <dd className="mt-1 text-slate-900">{student.goal || "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">薄弱科目</dt>
              <dd className="mt-1 text-slate-900">{student.weakSubjects || "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">薄弱知识点</dt>
              <dd className="mt-1 text-slate-900">{student.weakPoints || "-"}</dd>
            </div>
          </dl>
        </Card>
        <Card title="家长信息">
          <div className="text-sm leading-7">
            <div>{student.parentName || "未填写称呼"}</div>
            <div className="text-slate-500">{student.parentContact || "未填写联系方式"}</div>
          </div>
        </Card>
        <Card title="最近建议">
          <p className="text-sm leading-7 text-slate-700">{student.remark || "暂无备注。建议先通过错题分析沉淀薄弱点。"}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="薄弱知识点排名">
          {weakPointRows.length === 0 ? (
            <Empty>暂无可统计的薄弱知识点</Empty>
          ) : (
            <div className="grid gap-2">
              {weakPointRows.map((item) => (
                <div key={`${item.subject}-${item.knowledgePoint}`} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-slate-950">{item.knowledgePoint}</span>
                    <span className="ml-2 text-xs text-slate-500">{item.subject}</span>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600">{item.count} 次</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="科目掌握概览">
          {subjectRows.length === 0 ? (
            <Empty>暂无科目统计</Empty>
          ) : (
            <div className="grid gap-2">
              {subjectRows.map((item) => (
                <div key={item.subject} className="rounded-md border border-slate-100 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-950">{item.subject}</span>
                    <span className="text-xs text-slate-500">共 {item.total} 题</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${item.total ? Math.round((item.mastered / item.total) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    已掌握 {item.mastered} 题，待巩固 {item.active} 题
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="历史错题">
        {student.wrongQuestions.length === 0 ? (
          <Empty>暂无错题</Empty>
        ) : (
          <div className="grid gap-3">
            {student.wrongQuestions.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-100 p-3 text-sm">
                <div className="font-medium text-slate-950">
                  {item.subject} · {item.knowledgePoint || "未标注知识点"}
                </div>
                <div className="mt-1 text-slate-600">{item.reviewSuggestion || item.aiAnalysis}</div>
                <div className="mt-2 text-xs text-slate-400">{formatDate(item.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="学习计划">
          {student.studyPlans.length === 0 ? (
            <Empty>暂无学习计划</Empty>
          ) : (
            <div className="grid gap-3">
              {student.studyPlans.map((item) => (
                <pre key={item.id} className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-7 text-slate-700">
                  {item.content}
                </pre>
              ))}
            </div>
          )}
        </Card>
        <Card title="家长日报">
          {student.dailyReports.length === 0 ? (
            <Empty>暂无家长日报</Empty>
          ) : (
            <div className="grid gap-3">
              {student.dailyReports.map((item) => (
                <pre key={item.id} className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-7 text-slate-700">
                  {item.content}
                </pre>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
