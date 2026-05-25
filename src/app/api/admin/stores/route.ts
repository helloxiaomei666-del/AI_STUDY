import { hash } from "bcryptjs";
import { z } from "zod";
import { isPlatformAdmin } from "@/lib/auth";
import { ApiError, jsonError, jsonOk, readJson, requireApiUser } from "@/lib/api";
import { getCurrentMonthKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { dbIdSchema } from "@/lib/validation";

const createStoreSchema = z.object({
  name: z.string().min(1),
  ownerName: z.string().min(1),
  ownerPhone: z.string().min(1),
  ownerEmail: z.string().email().optional().nullable(),
  password: z.string().min(6).default("123456"),
  packageId: dbIdSchema,
  packageExpireAt: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  return requireApiUser(request, async (user) => {
    if (!isPlatformAdmin(user.role)) return jsonError("无权访问平台后台", 403);
    const stores = await prisma.store.findMany({
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        quotas: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { students: true, users: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(stores);
  });
}

export async function POST(request: Request) {
  return requireApiUser(request, async (user) => {
    if (!isPlatformAdmin(user.role)) return jsonError("无权访问平台后台", 403);
    const input = createStoreSchema.parse(await readJson(request));
    const pkg = await prisma.package.findUnique({ where: { id: input.packageId } });
    if (!pkg) throw new ApiError("套餐不存在", 404);

    const passwordHash = await hash(input.password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const owner = await tx.user.create({
        data: {
          name: input.ownerName,
          phone: input.ownerPhone,
          email: input.ownerEmail,
          passwordHash,
          role: "store_owner",
        },
      });
      const expire = input.packageExpireAt ? new Date(input.packageExpireAt) : new Date();
      if (!input.packageExpireAt) expire.setMonth(expire.getMonth() + 1);
      const store = await tx.store.create({
        data: {
          name: input.name,
          ownerUserId: owner.id,
          packageType: pkg.name,
          packageExpireAt: expire,
        },
      });
      const updatedOwner = await tx.user.update({ where: { id: owner.id }, data: { storeId: store.id } });
      await tx.storeQuota.create({
        data: {
          storeId: store.id,
          packageId: pkg.id,
          month: getCurrentMonthKey(),
          wrongQuestionQuota: pkg.wrongQuestionQuota,
          studyPlanQuota: pkg.studyPlanQuota,
          dailyReportQuota: pkg.dailyReportQuota,
        },
      });
      return { store, owner: updatedOwner };
    });

    return jsonOk(result, { status: 201 });
  });
}
