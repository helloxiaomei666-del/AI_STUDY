import { AIService } from "@/lib/ai/ai-service";
import { jsonOk, readJson, requireApiUser, requireStaffOperator, requireStoreId } from "@/lib/api";
import { dailyReportSchema } from "@/lib/validation";

export async function POST(request: Request) {
  return requireApiUser(request, async (user) => {
    requireStaffOperator(user);
    const input = dailyReportSchema.parse(await readJson(request));
    const record = await AIService.generateDailyReport({
      ...input,
      storeId: requireStoreId(user),
      userId: user.id,
    });
    return jsonOk(record, { status: 201 });
  });
}
