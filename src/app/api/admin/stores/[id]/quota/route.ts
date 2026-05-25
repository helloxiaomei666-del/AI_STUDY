import { z } from "zod";
import { isPlatformAdmin } from "@/lib/auth";
import { jsonError, jsonOk, readJson, requireApiUser } from "@/lib/api";
import { getCurrentMonthKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const quotaSchema = z.object({
  wrongQuestionQuota: z.coerce.number().int().min(0),
  studyPlanQuota: z.coerce.number().int().min(0),
  dailyReportQuota: z.coerce.number().int().min(0),
  status: z.enum(["active", "inactive", "disabled"]).optional(),
  packageExpireAt: z.string().optional().nullable(),
});

export async function PATCH(request: Request, context: Context) {
  return requireApiUser(request, async (user) => {
    if (!isPlatformAdmin(user.role)) return jsonError("无权访问平台后台", 403);
    const { id } = await context.params;
    const input = quotaSchema.parse(await readJson(request));

    const [store, quota] = await prisma.$transaction([
      prisma.store.update({
        where: { id },
        data: {
          status: input.status,
          packageExpireAt: input.packageExpireAt ? new Date(input.packageExpireAt) : undefined,
        },
      }),
      prisma.storeQuota.upsert({
        where: { storeId_month: { storeId: id, month: getCurrentMonthKey() } },
        update: {
          wrongQuestionQuota: input.wrongQuestionQuota,
          studyPlanQuota: input.studyPlanQuota,
          dailyReportQuota: input.dailyReportQuota,
        },
        create: {
          storeId: id,
          month: getCurrentMonthKey(),
          wrongQuestionQuota: input.wrongQuestionQuota,
          studyPlanQuota: input.studyPlanQuota,
          dailyReportQuota: input.dailyReportQuota,
        },
      }),
    ]);

    return jsonOk({ store, quota });
  });
}
