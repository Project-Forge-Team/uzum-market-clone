import { NextResponse } from "next/server";

const SERVER_API_URL =
  process.env.SERVER_API_URL ||
  "https://backend-uzum-market.onrender.com/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fixCookieForLocalhost(cookie: string): string {
  return cookie
    .replace(/;\s*Secure/gi, "")
    .replace(/;\s*SameSite=None/gi, "; SameSite=Lax")
    .replace(/;\s*Domain=[^;]*/gi, "");
}

async function proxy(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const pathAfterAuth =
    requestUrl.pathname.replace(/^\/api\/auth/, "").replace(/\/+$/, "");

  const target = `${SERVER_API_URL}/auth/${pathAfterAuth}${requestUrl.search}`;

  const body =
    request.method === "GET" ||
    request.method === "HEAD" ||
    request.method === "OPTIONS"
      ? undefined
      : await request.arrayBuffer();

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (
      ![
        "host",
        "origin",
        "referer",
        "content-length",
        "connection",
        "transfer-encoding",
      ].includes(lower)
    ) {
      headers.set(key, value);
    }
  }
  headers.set("host", "backend-uzum-market.onrender.com");

  const backendResponse = await fetch(target, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  const skipped = new Set([
    "content-length",
    "content-encoding",
    "transfer-encoding",
    "connection",
    "set-cookie",
  ]);

  for (const [key, value] of backendResponse.headers.entries()) {
    if (!skipped.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  }

  const isLocal =
    requestUrl.hostname === "localhost" ||
    requestUrl.hostname === "127.0.0.1" ||
    requestUrl.hostname === "::1";

  const cookies =
    typeof backendResponse.headers.getSetCookie === "function"
      ? backendResponse.headers.getSetCookie()
      : [];

  for (const cookie of cookies) {
    responseHeaders.append(
      "set-cookie",
      isLocal ? fixCookieForLocalhost(cookie) : cookie,
    );
  }

  const responseBody = await backendResponse.arrayBuffer();

  return new NextResponse(responseBody, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: Request) {
  return proxy(request);
}

export async function POST(request: Request) {
  return proxy(request);
}

export async function PUT(request: Request) {
  return proxy(request);
}

export async function PATCH(request: Request) {
  return proxy(request);
}

export async function DELETE(request: Request) {
  return proxy(request);
}

export async function OPTIONS(request: Request) {
  return proxy(request);
}
