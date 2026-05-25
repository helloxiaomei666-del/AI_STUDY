import { z } from "zod";
import { ApiError, jsonOk, readJson, requireApiUser, requireStaffOperator, requireStoreId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  content: z.string().min(1, "家长日报内容不能为空"),
});

export async function PATCH(request: Request, context: Context) {
  return requireApiUser(request, async (user) => {
    requireStaffOperator(user);
    const { id } = await context.params;
    const { content } = schema.parse(await readJson(request));
    const existing = await prisma.dailyReport.findFirst({ where: { id, storeId: requireStoreId(user) } });
    if (!existing) throw new ApiError("家长日报不存在或不属于当前门店", 404);
    const record = await prisma.dailyReport.update({
      where: { id },
      data: { content },
      include: { student: { select: { id: true, name: true, grade: true, parentName: true } } },
    });
    return jsonOk(record);
  });
}
