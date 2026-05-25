import Link from "next/link";
import { WrongQuestionWorkspace } from "@/components/wrong-question-workspace";
import { Card, Empty } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WrongQuestionsPage() {
  const user = await requireUser();
  const [students, wrongQuestions] = user.storeId
    ? await Promise.all([
        prisma.student.findMany({
          where: { storeId: user.storeId, status: "active" },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, grade: true, weakPoints: true },
        }),
        prisma.wrongQuestion.findMany({
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
        <h1 className="text-2xl font-semibold text-slate-950">AI错题分析与错题本</h1>
        <p className="mt-1 text-sm text-slate-500">
          聚焦数学、物理、化学和严谨学术英语，通过分层提示、完整解析和复习建议，把拍题行为转成可复盘的学习档案。
        </p>
      </div>
      {isOwner ? (
        <Card title="错题概览">
          {wrongQuestions.length === 0 ? (
            <Empty>暂无错题记录。上传和分析错题由督学在员工端完成。</Empty>
          ) : (
            <div className="grid gap-3">
              {wrongQuestions.map((item) => (
                <Link key={item.id} href={`/wrong-questions/${item.id}`} className="rounded-md border border-slate-200 p-3 text-sm hover:border-emerald-200 hover:bg-emerald-50">
                  <div className="font-medium text-slate-950">
                    {item.student.name} · {item.subject} · {item.knowledgePoint || "未标注知识点"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)} · {item.masteryStatus}</div>
                  <div className="mt-2 line-clamp-2 text-slate-600">{item.aiAnalysis}</div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <WrongQuestionWorkspace
          students={JSON.parse(JSON.stringify(students))}
          wrongQuestions={JSON.parse(JSON.stringify(wrongQuestions))}
        />
      )}
    </div>
  );
}
