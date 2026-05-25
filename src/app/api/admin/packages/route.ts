import { ApiError, jsonOk, readJson, requireApiUser, requirePlatformAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dbIdSchema, packageSchema } from "@/lib/validation";

const packagePatchSchema = packageSchema.partial().extend({
  id: dbIdSchema,
});

export async function GET(request: Request) {
  return requireApiUser(request, async (user) => {
    requirePlatformAdmin(user);
    const packages = await prisma.package.findMany({
      orderBy: { monthlyPrice: "asc" },
    });
    return jsonOk(packages);
  });
}

export async function POST(request: Request) {
  return requireApiUser(request, async (user) => {
    requirePlatformAdmin(user);
    const input = packageSchema.parse(await readJson(request));
    const pkg = await prisma.package.create({ data: input });
    return jsonOk(pkg, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  return requireApiUser(request, async (user) => {
    requirePlatformAdmin(user);
    const input = packagePatchSchema.parse(await readJson(request));
    const { id, ...data } = input;
    const exists = await prisma.package.findUnique({ where: { id } });
    if (!exists) throw new ApiError("套餐不存在", 404);
    const pkg = await prisma.package.update({ where: { id }, data });
    return jsonOk(pkg);
  });
}
