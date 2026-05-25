import { notFound } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { isPlatformAdmin, requireUser } from "@/lib/auth";
import { isAuthSecretStrong } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireUser();
  if (!isPlatformAdmin(user.role)) notFound();

  const [stores, packages, prompts, recentFailures, usageCount] = await Promise.all([
    prisma.store.findMany({
      include: {
        owner: { select: { name: true, phone: true } },
        quotas: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { students: true, users: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.package.findMany({ orderBy: { monthlyPrice: "asc" } }),
    prisma.promptTemplate.findMany({ orderBy: [{ featureType: "asc" }, { version: "desc" }] }),
    prisma.aiFailureLog.findMany({
      include: {
        store: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.aiUsageLog.count(),
  ]);

  const systemStatus = {
    database: Boolean(process.env.DATABASE_URL),
    authSecret: isAuthSecretStrong(),
    aiProvider: process.env.AI_PROVIDER || "mock",
    openaiKey: process.env.AI_PROVIDER === "openai" ? Boolean(process.env.OPENAI_API_KEY) : true,
    uploadProvider: process.env.UPLOAD_STORAGE_PROVIDER || "local",
    usageCount,
    recentFailures,
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">平台后台</h1>
        <p className="mt-1 text-sm text-slate-500">管理门店、套餐额度、Prompt模板、系统配置和AI调用异常。</p>
      </div>
      <AdminPanel
        stores={JSON.parse(JSON.stringify(stores))}
        packages={JSON.parse(JSON.stringify(packages))}
        prompts={JSON.parse(JSON.stringify(prompts))}
        systemStatus={JSON.parse(JSON.stringify(systemStatus))}
      />
    </div>
  );
}
