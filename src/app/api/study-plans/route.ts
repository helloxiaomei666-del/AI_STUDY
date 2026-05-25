import { jsonOk, parsePaging, requireApiUser, requireStoreId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  return requireApiUser(request, async (user) => {
    const paging = parsePaging(request, { limit: 50, maxLimit: 100 });
    const where = { storeId: requireStoreId(user) };
    const records = await prisma.studyPlan.findMany({
      where,
      include: { student: { select: { id: true, name: true, grade: true } } },
      orderBy: { createdAt: "desc" },
      skip: paging.skip,
      take: paging.limit,
    });
    const total = await prisma.studyPlan.count({ where });
    return jsonOk({ records, pagination: { page: paging.page, limit: paging.limit, total } });
  });
}
