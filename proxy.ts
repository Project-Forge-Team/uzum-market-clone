import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SERVER_API_URL = (
  process.env.SERVER_API_URL ||
  "https://backend-uzum-market.onrender.com/api"
).replace(/\/+$/, "");

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Режим A: браузер ходит на относительный /api, а Proxy прокидывает запрос
  // на бэкенд. Настоящий path (вместе с trailing slash) сохраняется.
  if (pathname.startsWith("/api/")) {
    const target = `${SERVER_API_URL}${pathname.replace(/^\/api/, "")}${request.nextUrl.search}`;
    return NextResponse.rewrite(new URL(target));
  }

  // Профиль/корзина/чекаут не блокируются proxy: access-токен может истечь,
  // а refresh живёт в cookie с Path=/api/auth/. В этом случае страница должна
  // открыться, а GET /api/auth/me/ сам обновит сессию (или вернёт 401, и
  // клиент покажет форму входа).
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
