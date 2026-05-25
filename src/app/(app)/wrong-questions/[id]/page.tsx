import Link from "next/link";
import { notFound } from "next/navigation";
import { WrongQuestionDetailEditor } from "@/components/wrong-question-detail-editor";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WrongQuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!user.storeId) notFound();

  const record = await prisma.wrongQuestion.findFirst({
    where: { id, storeId: user.storeId },
    include: { student: { select: { id: true, name: true, grade: true, weakPoints: true } } },
  });
  if (!record) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/wrong-questions" className="text-sm text-emerald-700 hover:text-emerald-900">
          返回错题本
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">错题详情</h1>
        <p className="mt-1 text-sm text-slate-500">查看图片、修订AI分析、调整掌握状态和下次复习日期。</p>
      </div>
      <WrongQuestionDetailEditor record={JSON.parse(JSON.stringify(record))} />
    </div>
  );
}
