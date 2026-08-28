import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("uzum_access_token")?.value;
  const refreshToken = request.cookies.get("uzum_refresh_token")?.value;
  // Пускаем, если есть access ИЛИ refresh (access обновит клиент)
  const hasSession = !!(accessToken || refreshToken);
  const { pathname } = request.nextUrl;

  const isProtectedRoute =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout");

  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Уже залогинен — не пускаем на login/register
  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/login",
    "/register",
  ],
};
