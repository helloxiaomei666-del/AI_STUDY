import { notFound } from "next/navigation";
import { AIService } from "@/lib/ai/ai-service";
import { jsonOk, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getStudentByAccessToken } from "@/lib/student-access";
import { studentPortalAnalyzeSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const access = await getStudentByAccessToken(token);
  if (!access) notFound();

  try {
    const input = studentPortalAnalyzeSchema.parse(await readJson(request));
    const record = await AIService.analyzeWrongQuestion({
      storeId: access.storeId,
      studentId: access.studentId,
      userId: access.student.assignedUserId,
      subject: input.subject,
      imageDataUrl: input.imageDataUrl,
      studentReason: input.studentReason,
      extraNote: ["学生端提交", input.extraNote].filter(Boolean).join("\n"),
    });

    await prisma.studentAiInteraction.create({
      data: {
        storeId: access.storeId,
        studentId: access.studentId,
        wrongQuestionId: record.id,
        interactionType: "student_upload_wrong_question",
        content: input.studentReason || input.extraNote || null,
      },
    });

    return jsonOk(record, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交失败";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
