/**
 * Локальный мок Django-бэкенда (для тестов прокси без доступа к Render).
 * Имитирует ключевые поведения реального бэкенда:
 *  - APPEND_SLASH: URL без слэша -> 301 на URL со слэшем (relative Location)
 *  - GET /api/auth/csrf/ -> ставит куку uzum_csrf (double-submit)
 *  - POST /api/auth/login/ -> требует X-CSRFToken == uzum_csrf, ставит 2 куки
 *  - POST /api/auth/register/ -> 201, ставит куки
 *  - GET /api/auth/me/ -> 200 только с кукой сессии
 *  - POST /api/auth/logout/ -> 204, чистит куки
 *
 * Запуск: node tests/mock-backend/server.mjs
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = 3001;

const sessions = new Set(); // "sessions" по куке uzum_sessionid

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const hasSlash = path.endsWith("/");

  // --- APPEND_SLASH (как Django CommonMiddleware) ---
  if (!hasSlash && !path.startsWith("/admin")) {
    res.writeHead(301, { Location: `${path}/`, "Content-Type": "text/html" });
    res.end();
    return;
  }

  const cookies = Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((p) => p.trim().split("="))
      .filter((p) => p[0]),
  );

  const setJson = (code, obj, headers = {}) => {
    res.writeHead(code, { "Content-Type": "application/json", ...headers });
    res.end(JSON.stringify(obj));
  };

  if (path === "/api/auth/csrf/" && req.method === "GET") {
    const token = randomUUID().replace(/-/g, "");
    // ВАЖНО: две Set-Cookie, чтобы поймать баг со склейкой заголовков
    res.setHeader("Set-Cookie", [
      `uzum_csrf=${token}; Path=/; SameSite=Lax; Secure`,
      `uzum_dev_mark=1; Path=/; SameSite=Lax; Secure`,
    ]);
    setJson(200, { detail: "CSRF cookie set" });
    return;
  }

  if (path === "/api/auth/register/" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)) || "{}");
    if (!body.email || !body.password || body.password !== body.password2) {
      setJson(400, { password: ["Некорректные данные"] });
      return;
    }
    const csrfCookie = cookies.uzum_csrf;
    if (!csrfCookie || req.headers["x-csrftoken"] !== csrfCookie) {
      setJson(403, { detail: "CSRF Failed: CSRF token missing or incorrect." });
      return;
    }
    const sid = randomUUID();
    sessions.add(sid);
    res.setHeader("Set-Cookie", [
      `uzum_sessionid=${sid}; Path=/; SameSite=Lax; Secure; HttpOnly`,
      `uzum_csrf=${randomUUID().replace(/-/g, "")}; Path=/; SameSite=Lax; Secure`,
    ]);
    setJson(201, {
      id: 42,
      email: body.email,
      first_name: body.first_name || "",
      last_name: body.last_name || "",
      phone: body.phone || "",
      date_joined: new Date().toISOString(),
    });
    return;
  }

  if (path === "/api/auth/login/" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const csrfCookie = cookies.uzum_csrf;
    if (!csrfCookie || req.headers["x-csrftoken"] !== csrfCookie) {
      setJson(403, { detail: "CSRF Failed: CSRF token missing or incorrect." });
      return;
    }
    if (body.email !== "test@test.com" || body.password !== "Password1") {
      setJson(401, { detail: "No active account found with the given credentials" });
      return;
    }
    const sid = randomUUID();
    sessions.add(sid);
    res.setHeader("Set-Cookie", [
      `uzum_sessionid=${sid}; Path=/; SameSite=Lax; Secure; HttpOnly`,
      `uzum_csrf=${randomUUID().replace(/-/g, "")}; Path=/; SameSite=Lax; Secure`,
    ]);
    setJson(200, {
      id: 42,
      email: "test@test.com",
      first_name: "Тест",
      last_name: "",
      phone: "",
      date_joined: "2026-01-01T00:00:00Z",
    });
    return;
  }

  if (path === "/api/auth/me/" && req.method === "GET") {
    if (cookies.uzum_sessionid && sessions.has(cookies.uzum_sessionid)) {
      setJson(200, {
        id: 42,
        email: "test@test.com",
        first_name: "Тест",
        last_name: "",
        phone: "",
        date_joined: "2026-01-01T00:00:00Z",
      });
    } else {
      setJson(401, { detail: "Authentication credentials were not provided." });
    }
    return;
  }

  if (path === "/api/auth/logout/" && req.method === "POST") {
    if (cookies.uzum_sessionid) sessions.delete(cookies.uzum_sessionid);
    res.setHeader("Set-Cookie", [
      'uzum_sessionid=""; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly',
    ]);
    res.writeHead(204);
    res.end();
    return;
  }

  if (path === "/api/products/" && req.method === "GET") {
    setJson(200, {
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 1, name: "Товар из мока" }],
    });
    return;
  }

  setJson(404, { detail: "Not found" });
});

server.listen(PORT, "127.0.0.1", () =>
  console.log(`Mock Django backend: http://localhost:${PORT}`),
);
