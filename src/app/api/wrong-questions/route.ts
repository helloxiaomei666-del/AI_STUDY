import { Prisma } from "@/generated/prisma/client";
import { jsonOk, parsePaging, requireApiUser, requireStoreId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  return requireApiUser(request, async (user) => {
    const url = new URL(request.url);
    const paging = parsePaging(request, { limit: 50, maxLimit: 100 });
    const where: Prisma.WrongQuestionWhereInput = {
      storeId: requireStoreId(user),
      ...(url.searchParams.get("studentId") ? { studentId: url.searchParams.get("studentId")! } : {}),
      ...(url.searchParams.get("subject") ? { subject: url.searchParams.get("subject")! } : {}),
      ...(url.searchParams.get("masteryStatus")
        ? { masteryStatus: url.searchParams.get("masteryStatus") as Prisma.EnumMasteryStatusFilter["equals"] }
        : {}),
    };
    const records = await prisma.wrongQuestion.findMany({
      where,
      include: { student: { select: { id: true, name: true, grade: true } } },
      orderBy: { createdAt: "desc" },
      skip: paging.skip,
      take: paging.limit,
    });
    const total = await prisma.wrongQuestion.count({ where });
    return jsonOk({ records, pagination: { page: paging.page, limit: paging.limit, total } });
  });
}
