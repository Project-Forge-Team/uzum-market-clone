import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("uzum_access_token")?.value;
  const { pathname } = request.nextUrl;

  // 1. Защищаем пути профиля и корзины
  const isProtectedRoute =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout");

  // Если нет токена и путь защищенный -> редирект на /login
  if (isProtectedRoute && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    // Запоминаем, куда юзер хотел пойти, чтобы после логина вернуть его туда
    loginUrl.searchParams.set("redirect", pathname); 
    return NextResponse.redirect(loginUrl);
  }

  // 2. Если юзер УЖЕ залогинен, но пытается зайти на /login или /register -> кидаем на главную
  if ((pathname === "/login" || pathname === "/register") && accessToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Указываем, на каких путях запускать этот middleware (чтобы не тормозить весь сайт)
export const config = {
  matcher: ["/profile/:path*", "/cart/:path*", "/checkout/:path*", "/login", "/register"],
};