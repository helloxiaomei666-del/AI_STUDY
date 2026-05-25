import { z } from "zod";
import { ApiError, jsonOk, readJson, requireApiUser, requireStaffOperator, requireStoreId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  masteryStatus: z.enum(["not_mastered", "reviewing", "mastered", "focus"]),
});

export async function PATCH(request: Request, context: Context) {
  return requireApiUser(request, async (user) => {
    requireStaffOperator(user);
    const { id } = await context.params;
    const { masteryStatus } = schema.parse(await readJson(request));
    const existing = await prisma.wrongQuestion.findFirst({ where: { id, storeId: requireStoreId(user) } });
    if (!existing) throw new ApiError("错题不存在或不属于当前门店", 404);
    const record = await prisma.wrongQuestion.update({ where: { id }, data: { masteryStatus } });
    return jsonOk(record);
  });
}
