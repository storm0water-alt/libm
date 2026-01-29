import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdminRoute } from "@/lib/permissions";

// Force Node.js runtime for Prisma Client compatibility
export const runtime = 'nodejs';

// Public routes that skip authentication and license checks
const publicRoutes = ["/login", "/api/auth", "/_next", "/api/health", "/favicon.ico"];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes to pass through
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get token from request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  if (!token) {
    // Redirect to login if not authenticated
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin-only routes
  if (isAdminRoute(pathname)) {
    const role = token.role as string;
    if (role !== "admin") {
      // Redirect to error page with permission denied message
      const errorUrl = new URL("/error", request.url);
      errorUrl.searchParams.set("error", "permission_denied");
      errorUrl.searchParams.set("from", "/dashboard");
      return NextResponse.redirect(errorUrl);
    }
  }

  // Note: License validation is done at login time (see login/actions.ts)
  // Middleware only checks authentication and authorization

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
