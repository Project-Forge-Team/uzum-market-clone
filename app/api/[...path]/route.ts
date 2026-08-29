import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "https://backend-uzum-market.onrender.com/api";

async function proxyRequest(req: NextRequest, path: string[], method: string) {
  // Собираем целевой URL (например, /api/auth/login/)
  const targetUrl = `${BACKEND_URL}/${path.join("/")}${req.nextUrl.search}`;

  // Копируем заголовки от браузера
  const headers = new Headers(req.headers);
  headers.delete("host"); // Удаляем host, чтобы не конфликтовал с backend

  // Явно передаем куки от браузера на бэкенд
  const cookie = req.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  // Тело запроса нужно только для POST, PUT, PATCH, DELETE
  const body =
    method !== "GET" && method !== "HEAD" ? await req.text() : undefined;

  // Делаем запрос на Render от имени сервера Next.js
  const res = await fetch(targetUrl, {
    method,
    headers,
    body,
    // Отключаем автоматическое следование редиректам, чтобы избежать циклов
    redirect: "manual",
  });

  // Создаем ответ для браузера
  const response = new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
  });

  // КРИТИЧЕСКИ ВАЖНО: Передаем куки (Set-Cookie) от Django обратно в браузер
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}

// Экспортируем обработчики для всех нужных методов
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(req, params.path, "GET");
}
export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(req, params.path, "POST");
}
export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(req, params.path, "PUT");
}
export async function PATCH(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(req, params.path, "PATCH");
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(req, params.path, "DELETE");
}
