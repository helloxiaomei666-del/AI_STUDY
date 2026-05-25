import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isPlatformAdmin } from "@/lib/auth";
import { getCurrentUser, type SessionUser } from "@/lib/auth";

export type ApiHandler<T = unknown> = (
  user: SessionUser,
  request: Request,
  context?: T,
) => Promise<Response>;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function zodMessage(error: ZodError) {
  return error.issues.map((issue) => issue.message).join("；") || "提交内容不符合要求";
}

function publicError(error: unknown) {
  if (error instanceof ApiError) return { message: error.message, status: error.status };
  if (error instanceof ZodError) return { message: zodMessage(error), status: 400 };
  if (error instanceof Error) return { message: error.message || "服务异常", status: 500 };
  return { message: "服务异常", status: 500 };
}

export function jsonErrorFromUnknown(error: unknown) {
  const { message, status } = publicError(error);
  return jsonError(message, status);
}

export async function requireApiUser<T>(
  request: Request,
  handler: ApiHandler<T>,
  context?: T,
) {
  const user = await getCurrentUser();
  if (!user) return jsonError("未登录或登录已过期，请重新登录", 401);

  try {
    return await handler(user, request, context);
  } catch (error) {
    console.error(error);
    const { message, status } = publicError(error);
    return jsonError(message, status);
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError("请求体不是有效 JSON", 400);
  }
}

export function requireStoreId(user: SessionUser) {
  if (!user.storeId) {
    throw new ApiError("当前账号未绑定门店", 403);
  }
  return user.storeId;
}

export function requirePlatformAdmin(user: SessionUser) {
  if (!isPlatformAdmin(user.role)) {
    throw new ApiError("无权访问平台后台", 403);
  }
}

export function requireStoreOwnerOrAdmin(user: SessionUser) {
  if (user.role !== "store_owner" && user.role !== "platform_admin") {
    throw new ApiError("无权管理门店账号", 403);
  }
}

export function requireStaffOperator(user: SessionUser) {
  if (user.role !== "staff") {
    throw new ApiError("该操作属于督学/员工工作台，老板账号仅可查看经营与学习概览", 403);
  }
}

export function parsePaging(request: Request, defaults: { limit?: number; maxLimit?: number } = {}) {
  const url = new URL(request.url);
  const maxLimit = defaults.maxLimit ?? 100;
  const requestedLimit = Number(url.searchParams.get("limit") || defaults.limit || 50);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(maxLimit, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : defaults.limit || 50));
  return {
    limit,
    page,
    skip: (page - 1) * limit,
  };
}
