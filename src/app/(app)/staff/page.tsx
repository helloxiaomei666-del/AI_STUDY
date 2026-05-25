import { StaffManager } from "@/components/staff-manager";
import { Card } from "@/components/ui";
import { canManageStoreUsers, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await requireUser();
  if (!canManageStoreUsers(user.role) || !user.storeId) {
    return (
      <Card title="无权限访问">
        <div className="text-sm leading-7 text-slate-600">
          当前账号不能管理员工账号。员工可以使用学生、错题、计划、日报和额度页面；如需创建或停用员工，请使用老板账号登录。
        </div>
      </Card>
    );
  }
  const users = await prisma.user.findMany({
    where: { storeId: user.storeId, status: "active", role: { in: ["store_owner", "staff"] } },
    select: { id: true, name: true, phone: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">员工账号</h1>
        <p className="mt-1 text-sm text-slate-500">老板可以创建督学账号，员工只能使用学生、错题、计划和日报功能。</p>
      </div>
      <StaffManager users={JSON.parse(JSON.stringify(users))} />
    </div>
  );
}
