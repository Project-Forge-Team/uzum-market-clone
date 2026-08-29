import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "https://backend-uzum-market.onrender.com/api";

async function proxyRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: string,
) {
  // 🔥 ВАЖНО: В Next.js 15+ params теперь является Promise, его нужно awaiting
  const resolvedParams = await context.params;
  const path = resolvedParams.path;

  // Собираем целевой URL (например, /api/auth/login/)
  const targetUrl = `${BACKEND_URL}/${path.join("/")}${req.nextUrl.search}`;

  // Копируем заголовки от браузера
  const headers = new Headers(req.headers);
  headers.delete("host"); // Удаляем host, чтобы не конфликтовал с бэкендом
  headers.delete("connection");

  // Явно передаем куки от браузера на бэкенд
  const cookie = req.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
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

  // 🔥 КРИТИЧЕСКИ ВАЖНО: Передаем куки (Set-Cookie) от Django обратно в браузер
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}

// Экспортируем обработчики с правильными типами для Next.js 15+
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, context, "GET");
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, context, "POST");
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, context, "PUT");
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, context, "PATCH");
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(req, context, "DELETE");
}
