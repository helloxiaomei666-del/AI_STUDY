import { jsonOk, requireApiUser, requireStoreId } from "@/lib/api";
import { getCurrentMonthKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  return requireApiUser(request, async (user) => {
    const storeId = requireStoreId(user);
    const [store, quota, logs] = await Promise.all([
      prisma.store.findUnique({ where: { id: storeId } }),
      prisma.storeQuota.findUnique({ where: { storeId_month: { storeId, month: getCurrentMonthKey() } } }),
      prisma.aiUsageLog.findMany({
        where: { storeId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { name: true } } },
      }),
    ]);
    const visibleLogs =
      user.role === "staff"
        ? logs.map((log) => ({
            id: log.id,
            storeId: log.storeId,
            userId: log.userId,
            user: log.user,
            featureType: log.featureType,
            modelName: log.modelName,
            chargedUnits: log.chargedUnits,
            createdAt: log.createdAt,
          }))
        : logs;
    return jsonOk({ store, quota, logs: visibleLogs });
  });
}
