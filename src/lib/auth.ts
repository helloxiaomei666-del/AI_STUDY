import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "zhixi_session";
const DEFAULT_SECRET = "dev-only-change-me-for-zhixi-guanji";

export type SessionUser = {
  id: string;
  storeId: string | null;
  name: string;
  role: UserRole;
};

function getSecret() {
  if (process.env.NODE_ENV === "production" && (!process.env.AUTH_SECRET || process.env.AUTH_SECRET === DEFAULT_SECRET)) {
    throw new Error("生产环境必须配置安全的 AUTH_SECRET");
  }
  return new TextEncoder().encode(process.env.AUTH_SECRET || DEFAULT_SECRET);
}

export async function createSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function readSessionToken(token?: string): Promise<SessionUser | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: String(payload.id),
      storeId: payload.storeId ? String(payload.storeId) : null,
      name: String(payload.name),
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await readSessionToken(token);
  if (!session) return null;

  const user = await prisma.user.findFirst({
    where: { id: session.id, status: "active" },
    select: { id: true, storeId: true, name: true, role: true },
  });

  return user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function canManageStoreUsers(role: UserRole) {
  return role === "platform_admin" || role === "store_owner";
}

export function isPlatformAdmin(role: UserRole) {
  return role === "platform_admin";
}

export { COOKIE_NAME };
