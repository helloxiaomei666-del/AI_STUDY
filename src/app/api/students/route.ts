import { Prisma } from "@/generated/prisma/client";
import { isPlatformAdmin } from "@/lib/auth";
import { jsonOk, readJson, requireApiUser, requireStaffOperator, requireStoreId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { studentSchema } from "@/lib/validation";

export async function GET(request: Request) {
  return requireApiUser(request, async (user) => {
    const url = new URL(request.url);
    const search = url.searchParams.get("q") || "";
    const storeId = url.searchParams.get("storeId");
    const where: Prisma.StudentWhereInput = {
      status: "active",
      ...(isPlatformAdmin(user.role) ? (storeId ? { storeId } : {}) : { storeId: requireStoreId(user) }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { grade: { contains: search, mode: "insensitive" } },
              { weakPoints: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const students = await prisma.student.findMany({
      where,
      include: { assignedUser: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(students);
  });
}

export async function POST(request: Request) {
  return requireApiUser(request, async (user) => {
    requireStaffOperator(user);
    const parsed = studentSchema.parse(await readJson(request));
    const storeId = requireStoreId(user);
    const student = await prisma.student.create({
      data: {
        ...parsed,
        storeId,
        assignedUserId: parsed.assignedUserId || user.id,
      },
    });
    return jsonOk(student, { status: 201 });
  });
}
