import { ApiError, jsonError, jsonErrorFromUnknown, jsonOk, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getStudentByAccessToken } from "@/lib/student-access";
import { studentPortalInteractionSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const access = await getStudentByAccessToken(token);
  if (!access) return jsonError("学生端链接无效或已过期", 404);

  try {
    const input = studentPortalInteractionSchema.parse(await readJson(request));
    if (input.wrongQuestionId) {
      const wrongQuestion = await prisma.wrongQuestion.findFirst({
        where: { id: input.wrongQuestionId, storeId: access.storeId, studentId: access.studentId },
        select: { id: true },
      });
      if (!wrongQuestion) throw new ApiError("错题不存在或不属于当前学生", 404);
    }

    const record = await prisma.studentAiInteraction.create({
      data: {
        storeId: access.storeId,
        studentId: access.studentId,
        wrongQuestionId: input.wrongQuestionId || null,
        interactionType: input.interactionType,
        content: input.content || null,
      },
    });

    return jsonOk(record, { status: 201 });
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
