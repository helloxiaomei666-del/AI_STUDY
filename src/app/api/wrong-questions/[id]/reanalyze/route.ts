import { AIService } from "@/lib/ai/ai-service";
import { jsonOk, readJson, requireApiUser, requireStaffOperator, requireStoreId } from "@/lib/api";
import { reanalyzeWrongQuestionSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return requireApiUser(request, async (user) => {
    requireStaffOperator(user);
    const { id } = await context.params;
    const input = reanalyzeWrongQuestionSchema.parse(await readJson(request));
    const record = await AIService.reanalyzeWrongQuestion({
      wrongQuestionId: id,
      storeId: requireStoreId(user),
      userId: user.id,
      extraNote: input.extraNote,
    });
    return jsonOk(record);
  });
}
