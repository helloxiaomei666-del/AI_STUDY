import { ApiError, jsonOk, requireApiUser, requireStaffOperator, requireStoreId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return requireApiUser(request, async (user) => {
    requireStaffOperator(user);
    const { id } = await context.params;
    const existing = await prisma.dailyReport.findFirst({ where: { id, storeId: requireStoreId(user) } });
    if (!existing) throw new ApiError("日报不存在或不属于当前门店", 404);
    const record = await prisma.dailyReport.update({
      where: { id },
      data: { copiedCount: { increment: 1 } },
    });
    return jsonOk(record);
  });
}
