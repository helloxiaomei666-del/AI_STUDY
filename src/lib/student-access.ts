import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function createStudentAccessTokenValue() {
  return randomBytes(24).toString("base64url");
}

export async function ensureStudentAccessToken(studentId: string, storeId: string) {
  const existing = await prisma.studentAccessToken.findFirst({
    where: {
      studentId,
      storeId,
      status: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.studentAccessToken.create({
    data: {
      studentId,
      storeId,
      token: createStudentAccessTokenValue(),
    },
  });
}

export async function getStudentByAccessToken(token: string) {
  const access = await prisma.studentAccessToken.findUnique({
    where: { token },
    include: {
      student: {
        include: {
          studyPlans: { orderBy: { createdAt: "desc" }, take: 1 },
          wrongQuestions: { orderBy: { createdAt: "desc" }, take: 20 },
          aiInteractions: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
    },
  });
  if (!access || access.status !== "active") return null;
  if (access.expiresAt && access.expiresAt < new Date()) return null;
  if (access.student.status !== "active") return null;

  await prisma.studentAccessToken.update({
    where: { id: access.id },
    data: { lastUsedAt: new Date() },
  });
  return access;
}
