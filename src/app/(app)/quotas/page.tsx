import { Card, Empty } from "@/components/ui";
import { formatDate, getCurrentMonthKey, quotaPercent } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function QuotasPage() {
  const user = await requireUser();
  const storeId = user.storeId;
  const canViewCost = user.role !== "staff";
  const [store, quota, logs] = storeId
    ? await Promise.all([
        prisma.store.findUnique({ where: { id: storeId } }),
        prisma.storeQuota.findUnique({ where: { storeId_month: { storeId, month: getCurrentMonthKey() } } }),
        prisma.aiUsageLog.findMany({
          where: { storeId },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 80,
        }),
      ])
    : [null, null, []];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">套餐与AI额度</h1>
        <p className="mt-1 text-sm text-slate-500">门店可查看额度，平台可在后台调整额度与套餐状态。员工账号不展示平台成本。</p>
      </div>

      <Card title="当前套餐">
        {!store ? (
          <Empty>当前账号未绑定门店</Empty>
        ) : (
          <div className="grid gap-4 text-sm md:grid-cols-3">
            <div>
              <div className="text-slate-500">门店</div>
              <div className="mt-1 font-medium text-slate-950">{store.name}</div>
            </div>
            <div>
              <div className="text-slate-500">套餐</div>
              <div className="mt-1 font-medium text-slate-950">{store.packageType || "-"}</div>
            </div>
            <div>
              <div className="text-slate-500">到期时间</div>
              <div className="mt-1 font-medium text-slate-950">{formatDate(store.packageExpireAt)}</div>
            </div>
          </div>
        )}
      </Card>

      <Card title="本月额度">
        {!quota ? (
          <Empty>暂无额度配置</Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["错题分析", quota.wrongQuestionUsed, quota.wrongQuestionQuota],
              ["学习计划", quota.studyPlanUsed, quota.studyPlanQuota],
              ["家长日报", quota.dailyReportUsed, quota.dailyReportQuota],
            ].map(([label, used, total]) => (
              <div key={String(label)} className="rounded-md border border-slate-200 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{label}</span>
                  <span className="text-slate-500">
                    {used}/{total}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-emerald-700" style={{ width: `${quotaPercent(Number(used), Number(total))}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="AI调用记录">
        {logs.length === 0 ? (
          <Empty>暂无调用记录</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="py-3 font-medium">功能</th>
                  <th className="py-3 font-medium">模型</th>
                  <th className="py-3 font-medium">Token</th>
                  {canViewCost && <th className="py-3 font-medium">成本</th>}
                  <th className="py-3 font-medium">操作人</th>
                  <th className="py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100">
                    <td className="py-3">{log.featureType}</td>
                    <td className="py-3">{log.modelName}</td>
                    <td className="py-3">
                      {log.inputTokens}/{log.outputTokens}
                    </td>
                    {canViewCost && <td className="py-3">￥{String(log.cost)}</td>}
                    <td className="py-3">{log.user?.name || "-"}</td>
                    <td className="py-3 text-slate-500">{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
