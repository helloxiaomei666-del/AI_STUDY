import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "zhixi_session";

const protectedPrefixes = [
  "/admin",
  "/dashboard",
  "/daily-reports",
  "/quotas",
  "/staff",
  "/students",
  "/study-plans",
  "/workflow",
  "/wrong-questions",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isProtected) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get(COOKIE_NAME)?.value);
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/daily-reports/:path*",
    "/quotas/:path*",
    "/staff/:path*",
    "/students/:path*",
    "/study-plans/:path*",
    "/workflow/:path*",
    "/wrong-questions/:path*",
  ],
};
