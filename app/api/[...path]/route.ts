import { NextRequest, NextResponse } from "next/server";

/**
 * Прокси всех клиентских запросов /api/* → Django-бэкенд.
 *
 * Почему это нужно: куки сессии (HttpOnly) и CSRF-токены работают без
 * CORS-танцев только в рамках одного origin. Фронт на Vercel ходит на
 * бэкенд на Render через этот же-origin прокси.
 *
 * Критичные правила, которые раньше были сломаны (см. git history):
 *  1. Django требует трейлинг-слэш (/api/auth/login/). Next.js отдаёт
 *     params БЕЗ пустого сегмента для URL со слэшем, поэтому путь нужно
 *     нормализовать самому — иначе Django отвечает 301 (APPEND_SLASH),
 *     который прокси раньше отдавал браузеру без Location → fetch падал
 *     с "Failed to fetch" на каждом запросе авторизации.
 *  2. Заголовки ответа (в т.ч. Location и Content-Type) нужно копировать.
 *  3. Set-Cookie может быть несколько — только getSetCookie() переносит
 *     их корректно (headers.get() склеивает их в один битый заголовок).
 *  4. Hop-by-hop заголовки и accept-encoding нельзя пробрасывать.
 */

const BACKEND_ORIGIN = (
  process.env.BACKEND_URL ?? "https://backend-uzum-market.onrender.com/api"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");
const BACKEND_API = `${BACKEND_ORIGIN}/api`;

/** Заголовки запроса, которые нельзя пробрасывать на бэкенд. */
const SKIP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length", // fetch пересчитает сам
  "accept-encoding", // пусть undici сам согласует сжатие и распакует ответ
  "cdn-loop",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-proto",
  "x-forwarded-server",
  "x-real-ip",
]);

/** Заголовки ответа бэкенда, которые имеет смысл передать браузеру. */
const PASS_RESPONSE_HEADERS = [
  "content-type",
  "cache-control",
  "vary",
  "allow",
  "etag",
  "last-modified",
];

const REQUEST_TIMEOUT_MS = 55_000; // Render free tier: холодный старт ~50с

interface ProxyContext {
  params: Promise<{ path?: string[] }>;
}

async function proxyRequest(
  req: NextRequest,
  context: ProxyContext,
  method: string,
): Promise<NextResponse> {
  const resolvedParams = await context.params;
  const segments = (resolvedParams.path ?? []).filter(Boolean);

  // 🔑 Нормализация: всегда добавляем трейлинг-слэш (Django: APPEND_SLASH).
  const joined = segments.join("/");
  const targetPath = joined === "" ? "" : `${joined}/`;
  const search = req.nextUrl.search || "";

  // Копируем только безопасные заголовки браузерного запроса.
  const headers = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  // Тело запроса нужно только для методов, которые его поддерживают
  const body =
    method !== "GET" && method !== "HEAD" ? await req.text() : undefined;

  // Делаем запрос на Render от имени сервера Next.js
  const res = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: "manual", // 🔥 Отключаем автоматическое следование редиректам, чтобы избежать циклов
  });

  // Создаем ответ для браузера
  const response = new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
  });

  // Важно: Django может выставлять несколько Set-Cookie (sessionid + csrftoken).
  // `Headers.set` заменяет заголовок целиком, поэтому при нескольких cookies
  // теряются все, кроме последнего. Здесь аккуратно переносим все значения.
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    response.headers.append("set-cookie", cookie);
  }

  // На случай, если бэкенд вернул старый формат заголовка в одном значении
  const legacySetCookie = res.headers.get("set-cookie");
  if (legacySetCookie && setCookies.length === 0) {
    response.headers.set("set-cookie", legacySetCookie);
  }

  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.text() : undefined;

  const doFetch = (url: string) =>
    fetch(url, {
      method,
      headers,
      body,
      redirect: "manual",
      credentials: "include",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

  try {
    let res = await doFetch(`${BACKEND_API}/${targetPath}${search}`);

    // Страховка: если бэкенд всё же редиректит (напр. /login → /login/),
    // идём за ним сами, сохраняя метод и тело, — браузеру 3xx не отдаём.
    let hops = 0;
    while (
      res.status >= 300 &&
      res.status < 400 &&
      res.status !== 304 &&
      hops < 3
    ) {
      const location = res.headers.get("location");
      if (!location) break;
      const nextUrl = new URL(location, `${BACKEND_API}/${targetPath}`).toString();
      res = await doFetch(nextUrl);
      hops += 1;
    }

    const responseHeaders = new Headers();
    for (const name of PASS_RESPONSE_HEADERS) {
      const value = res.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    const response = new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });

    // 🔑 Set-Cookie: переносим КАЖДУЮ куку отдельным заголовком.
    // headers.get("set-cookie") склеил бы их запятыми в одну битую куку —
    // из-за этого сессия после логина не сохранялась бы.
    const setCookies =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }

    return response;
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.name === "TimeoutError"
          ? "Бэкенд не ответил вовремя (Render просыпается ~50с). Попробуйте ещё раз через минуту."
          : `Бэкенд недоступен: ${error.message}`
        : "Бэкенд недоступен";
    return NextResponse.json({ detail }, { status: 502 });
  }
}

// Next.js 15+/16: params — Promise, обязательно await (см. proxyRequest).
export async function GET(req: NextRequest, context: ProxyContext) {
  return proxyRequest(req, context, "GET");
}
export async function POST(req: NextRequest, context: ProxyContext) {
  return proxyRequest(req, context, "POST");
}
export async function PUT(req: NextRequest, context: ProxyContext) {
  return proxyRequest(req, context, "PUT");
}
export async function PATCH(req: NextRequest, context: ProxyContext) {
  return proxyRequest(req, context, "PATCH");
}
export async function DELETE(req: NextRequest, context: ProxyContext) {
  return proxyRequest(req, context, "DELETE");
}

// Холодный старт Render может занимать ~50 секунд — даём функции время.
export const maxDuration = 60;
