import { hash } from "bcryptjs";
import { z } from "zod";
import { canManageStoreUsers, isPlatformAdmin } from "@/lib/auth";
import { jsonError, jsonOk, readJson, requireApiUser, requireStoreId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const staffSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.preprocess((value) => (value === "" ? null : value), z.string().email().optional().nullable()),
  password: z.string().min(6).default("123456"),
  role: z.enum(["store_owner", "staff"]).default("staff"),
});

export async function GET(request: Request) {
  return requireApiUser(request, async (user) => {
    if (!canManageStoreUsers(user.role)) return jsonError("无权管理员工", 403);
    const storeId = requireStoreId(user);
    const users = await prisma.user.findMany({
      where: { storeId, status: "active", role: { in: ["store_owner", "staff"] } },
      select: { id: true, name: true, phone: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(users);
  });
}

export async function POST(request: Request) {
  return requireApiUser(request, async (user) => {
    if (!canManageStoreUsers(user.role)) return jsonError("无权管理员工", 403);
    const input = staffSchema.parse(await readJson(request));
    if (!isPlatformAdmin(user.role) && input.role !== "staff") {
      return jsonError("老板只能创建员工账号", 403);
    }
    const storeId = requireStoreId(user);
    const duplicate = await prisma.user.findFirst({
      where: {
        OR: [{ phone: input.phone }, ...(input.email ? [{ email: input.email }] : [])],
      },
      select: { id: true },
    });
    if (duplicate) return jsonError("手机号或邮箱已被使用", 409);

    if (input.role === "staff") {
      const store = await prisma.store.findUnique({ where: { id: storeId } });
      const pkg = store?.packageType ? await prisma.package.findFirst({ where: { name: store.packageType, status: "active" } }) : null;
      if (pkg) {
        const staffCount = await prisma.user.count({ where: { storeId, role: "staff", status: "active" } });
        if (staffCount >= pkg.staffLimit) return jsonError("员工数量已达到当前套餐上限", 402);
      }
    }

    const passwordHash = await hash(input.password, 10);
    const created = await prisma.user.create({
      data: {
        storeId,
        name: input.name,
        phone: input.phone,
        email: input.email,
        role: input.role,
        passwordHash,
      },
      select: { id: true, name: true, phone: true, email: true, role: true, createdAt: true },
    });
    return jsonOk(created, { status: 201 });
  });
}
