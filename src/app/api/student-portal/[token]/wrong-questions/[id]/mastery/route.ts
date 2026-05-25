import { ApiError, jsonError, jsonErrorFromUnknown, jsonOk, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getStudentByAccessToken } from "@/lib/student-access";
import { studentPortalMasterySchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  const access = await getStudentByAccessToken(token);
  if (!access) return jsonError("学生端链接无效或已过期", 404);

  try {
    const input = studentPortalMasterySchema.parse(await readJson(request));
    const wrongQuestion = await prisma.wrongQuestion.findFirst({
      where: { id, storeId: access.storeId, studentId: access.studentId },
    });
    if (!wrongQuestion) throw new ApiError("错题不存在或不属于当前学生", 404);

    const record = await prisma.$transaction(async (tx) => {
      const updated = await tx.wrongQuestion.update({
        where: { id },
        data: { masteryStatus: input.masteryStatus },
      });
      await tx.studentAiInteraction.create({
        data: {
          storeId: access.storeId,
          studentId: access.studentId,
          wrongQuestionId: id,
          interactionType: "student_mark_mastery",
          content: input.content || input.masteryStatus,
        },
      });
      return updated;
    });

    return jsonOk(record);
  } catch (error) {
    return jsonErrorFromUnknown(error);
  }
}
