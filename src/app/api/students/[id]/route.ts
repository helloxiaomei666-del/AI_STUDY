import { ApiError, jsonOk, readJson, requireApiUser, requireStaffOperator, requireStoreId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { studentSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return requireApiUser(request, async (user) => {
    const { id } = await context.params;
    const student = await prisma.student.findFirst({
      where: { id, storeId: requireStoreId(user) },
      include: {
        wrongQuestions: { orderBy: { createdAt: "desc" }, take: 20 },
        studyPlans: { orderBy: { createdAt: "desc" }, take: 10 },
        dailyReports: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!student) throw new ApiError("学生不存在或不属于当前门店", 404);
    return jsonOk(student);
  });
}

export async function PATCH(request: Request, context: Context) {
  return requireApiUser(request, async (user) => {
    requireStaffOperator(user);
    const { id } = await context.params;
    const parsed = studentSchema.partial().parse(await readJson(request));
    const existing = await prisma.student.findFirst({ where: { id, storeId: requireStoreId(user) } });
    if (!existing) throw new ApiError("学生不存在或不属于当前门店", 404);
    const student = await prisma.student.update({ where: { id }, data: parsed });
    return jsonOk(student);
  });
}

export async function DELETE(request: Request, context: Context) {
  return requireApiUser(request, async (user) => {
    requireStaffOperator(user);
    const { id } = await context.params;
    const existing = await prisma.student.findFirst({ where: { id, storeId: requireStoreId(user) } });
    if (!existing) throw new ApiError("学生不存在或不属于当前门店", 404);
    const student = await prisma.student.update({ where: { id }, data: { status: "inactive" } });
    return jsonOk(student);
  });
}
