import { NextRequest, NextResponse } from "next/server";
import {
  BACKEND_API,
  BACKEND_ORIGIN,
  BACKEND_TIMEOUT_MS,
  normalizeApiPath,
} from "@/lib/server/backend";

/**
 * Прокси всех браузерных запросов /api/* → Django-бэкенд.
 *
 * Зачем прокси, а не прямые запросы с CORS: куки сессии (HttpOnly) и
 * double-submit CSRF работают без танцев только в рамках одного origin.
 * Фронт ходит на свой же `/api/*`, а сюда уже приходит серверный fetch.
 *
 * Критичные правила (каждое было багом в истории репозитория):
 *  1. Django с APPEND_SLASH ждёт `/api/auth/login/`. Next отдаёт params без
 *     пустого сегмента, поэтому путь нормализуем сами (normalizeApiPath) —
 *     иначе прилетает 301, а POST после редиректа деградирует в GET.
 *     Исключения — `/api/health` и файлы `/api/uploads/<имя>.png`: там слэша
 *     быть не должно, бэкенд отвечает на них 404.
 *  2. Заголовки ответа (Content-Type, Location) нужно копировать.
 *  3. Set-Cookie может быть несколько — только getSetCookie() переносит их
 *     корректно (headers.get() склеил бы их в одну битую куку и сессия
 *     не сохранялась бы после логина).
 *  4. Hop-by-hop заголовки и accept-encoding пробрасывать нельзя.
 *  5. Origin/Referer подменяем на домен бэкенда: запрос исходит от нас, как
 *     от обычного reverse-proxy, иначе CSRF-проверка отвергнет чужой домен.
 */

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
  "content-disposition",
  // Rate limit на логине: фронт показывает «подождите N секунд».
  "retry-after",
];

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
  const targetPath = normalizeApiPath(segments.join("/"));
  const search = req.nextUrl.search || "";

  // Копируем только безопасные заголовки браузерного запроса.
  const headers = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  if (headers.has("origin")) headers.set("origin", BACKEND_ORIGIN);
  if (headers.has("referer")) headers.set("referer", `${BACKEND_ORIGIN}/`);

  // Тело читаем как поток байт: multipart-загрузка картинок не должна
  // испортиться перекодировкой в строку.
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const doFetch = (url: string) =>
    fetch(url, {
      method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });

  try {
    let res = await doFetch(`${BACKEND_API}/${targetPath}${search}`);

    // Страховка: если бэкенд всё же редиректит, идём за ним сами, сохраняя
    // метод и тело, — браузеру 3xx не отдаём.
    let hops = 0;
    while (res.status >= 300 && res.status < 400 && res.status !== 304 && hops < 3) {
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
    const setCookies =
      typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }

    // Fallback для сред без getSetCookie(): лучше даже склеенная кука, чем ни одной.
    if (setCookies.length === 0) {
      const legacySetCookie = res.headers.get("set-cookie");
      if (legacySetCookie) response.headers.set("set-cookie", legacySetCookie);
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
