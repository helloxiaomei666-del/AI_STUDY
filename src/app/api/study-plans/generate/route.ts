import { AIService } from "@/lib/ai/ai-service";
import { jsonOk, readJson, requireApiUser, requireStaffOperator, requireStoreId } from "@/lib/api";
import { studyPlanSchema } from "@/lib/validation";

export async function POST(request: Request) {
  return requireApiUser(request, async (user) => {
    requireStaffOperator(user);
    const input = studyPlanSchema.parse(await readJson(request));
    const record = await AIService.generateStudyPlan({
      ...input,
      storeId: requireStoreId(user),
      userId: user.id,
    });
    return jsonOk(record, { status: 201 });
  });
}
