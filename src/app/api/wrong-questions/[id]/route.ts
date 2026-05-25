import { ApiError, jsonOk, readJson, requireApiUser, requireStaffOperator, requireStoreId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { wrongQuestionUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return requireApiUser(request, async (user) => {
    const { id } = await context.params;
    const record = await prisma.wrongQuestion.findFirst({
      where: { id, storeId: requireStoreId(user) },
      include: { student: { select: { id: true, name: true, grade: true, weakPoints: true } } },
    });
    if (!record) throw new ApiError("错题不存在或不属于当前门店", 404);
    return jsonOk(record);
  });
}

export async function PATCH(request: Request, context: Context) {
  return requireApiUser(request, async (user) => {
    requireStaffOperator(user);
    const { id } = await context.params;
    const storeId = requireStoreId(user);
    const input = wrongQuestionUpdateSchema.parse(await readJson(request));
    const existing = await prisma.wrongQuestion.findFirst({ where: { id, storeId } });
    if (!existing) throw new ApiError("错题不存在或不属于当前门店", 404);

    const record = await prisma.wrongQuestion.update({
      where: { id },
      data: {
        subject: input.subject,
        knowledgePoint: input.knowledgePoint,
        questionType: input.questionType,
        difficulty: input.difficulty,
        ocrText: input.ocrText,
        aiAnalysis: input.aiAnalysis,
        hintLevel1: input.hintLevel1,
        hintLevel2: input.hintLevel2,
        fullExplanation: input.fullExplanation,
        reviewSuggestion: input.reviewSuggestion,
        nextReviewDate: input.nextReviewDate ? new Date(input.nextReviewDate) : input.nextReviewDate === null ? null : undefined,
        masteryStatus: input.masteryStatus,
      },
      include: { student: { select: { id: true, name: true, grade: true } } },
    });
    return jsonOk(record);
  });
}
