import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { COOKIE_NAME, createSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { assertServerConfig } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  account: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    assertServerConfig();
    const contentType = request.headers.get("content-type") || "";
    const isFormSubmit = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
    const redirectBase = request.headers.get("origin") || request.url;
    const rawBody = isFormSubmit ? Object.fromEntries(await request.formData()) : await request.json().catch(() => null);
    const body = loginSchema.safeParse(rawBody);
    if (!body.success) return jsonError("请输入账号和密码");

    const user = await prisma.user.findFirst({
      where: {
        status: "active",
        OR: [{ phone: body.data.account }, { email: body.data.account }],
      },
    });

    if (!user || !(await compare(body.data.password, user.passwordHash))) {
      if (isFormSubmit) return NextResponse.redirect(new URL("/login?error=invalid_credentials", redirectBase), 303);
      return jsonError("账号或密码错误", 401);
    }

    const token = await createSession({
      id: user.id,
      storeId: user.storeId,
      name: user.name,
      role: user.role,
    });
    const response = isFormSubmit
      ? NextResponse.redirect(new URL("/dashboard", redirectBase), 303)
      : NextResponse.json({
          ok: true,
          data: { id: user.id, name: user.name, role: user.role, storeId: user.storeId },
        });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error(error);
    return jsonError(error instanceof Error ? error.message : "登录服务异常，请确认数据库已启动并已执行迁移和 seed", 500);
  }
}
