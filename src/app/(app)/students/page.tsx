import { StudentManager } from "@/components/student-manager";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const user = await requireUser();
  const isOwner = user.role === "store_owner";
  const students = user.storeId
    ? await prisma.student.findMany({
        where: { storeId: user.storeId, status: "active" },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">{isOwner ? "学生概览" : "学生管理"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isOwner ? "老板端只查看学生规模、薄弱点和学习状态；新增与编辑由督学在员工端完成。" : "维护学生档案，让 AI 分析和日报能引用学习目标、薄弱点和家长称呼。"}
        </p>
      </div>
      <StudentManager students={JSON.parse(JSON.stringify(students))} readOnly={isOwner} />
    </div>
  );
}
