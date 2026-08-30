/**
 * Мок Django-бэкенда для `npm test`.
 *
 * Зачем он нужен: настоящий бэкенд живёт на Render, а CI и песочница не всегда
 * имеют туда доступ (и гонять чужой прод на каждом коммите — плохая идея).
 * Этот сервер повторяет контракт из docs/BACKEND_SPEC.md ровно настолько,
 * насколько его использует фронтенд, включая поведение, на котором фронт
 * спотыкался бы при расхождении:
 *
 *   - APPEND_SLASH: путь без завершающего слэша → 301 на путь со слэшем
 *     (кроме `/api/health` и файлов `/api/uploads/<имя>.<ext>`);
 *   - куки `uzum_sessionid` (HttpOnly) + `uzum_csrf` (читается из JS);
 *   - double-submit CSRF на всех небезопасных методах, КРОМЕ `PUT /api/orders/`
 *     (публичное превью корзины — без CSRF и без авторизации);
 *   - анонимный `GET /api/auth/me/` → 401 `{detail}`, а `GET /api/shop/` без
 *     магазина → 200 с телом `null`;
 *   - ошибки строго в формате `{"detail": str, "fields": {поле: текст}}`;
 *   - картинки товаров отдаются с этого же домена по `/products/gen/*.svg`.
 *
 * Запуск вручную: node tests/mock-backend/server.mjs  (порт 3001 или PORT).
 */
import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getDb, resetDb, saveDb } from "./lib/db.ts";
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  assertCsrf,
  createSession,
  destroySession,
  findUserByToken,
  loginUser,
  newCsrfToken,
  publicUser,
  registerUser,
  requireUser,
  updateProfile,
} from "./lib/auth.ts";
import { ApiError, productQueryFromUrl, toNumber } from "./lib/http.ts";
import {
  getOrderForUser,
  getProductByIdOrSlug,
  getSellerBySlugOrId,
  listCategories,
  listOrders,
  listProducts,
  listReviews,
  listSellers,
  sellerOrders,
  sellerProducts,
  sellerStats,
  serializeSeller,
} from "./lib/catalog.ts";
import {
  addView,
  advanceOrder,
  calcOrderTotals,
  changePassword,
  createOrder,
  createProduct,
  deleteProduct,
  deleteReview,
  ensureShopForUser,
  readUpload,
  replyToReview,
  saveUpload,
  setProductStatus,
  updateProduct,
  updateShop,
  upsertReview,
} from "./lib/actions.ts";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "127.0.0.1";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLIC_DIR = path.join(REPO_ROOT, "public");

/** Пути под /api, которые отдаются БЕЗ завершающего слэша (как на проде). */
const NO_SLASH = new Set(["/api/health"]);

const envelope = (results) => ({
  count: results.length,
  page: 1,
  page_size: results.length,
  total_pages: 1,
  next: false,
  previous: false,
  results,
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

/** Разбор multipart/form-data — нужен ровно для одного поля `file`. */
function parseMultipart(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? "");
  const boundary = match?.[1] ?? match?.[2];
  if (!boundary) return null;

  const sep = Buffer.from(`--${boundary}`);
  let index = buffer.indexOf(sep);
  while (index >= 0) {
    const start = index + sep.length;
    const next = buffer.indexOf(sep, start);
    if (next < 0) break;
    const part = buffer.subarray(start, next);
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd > 0) {
      const rawHeaders = part.subarray(0, headerEnd).toString("utf8");
      if (/name="file"/i.test(rawHeaders)) {
        const filename = /filename="([^"]*)"/i.exec(rawHeaders)?.[1] ?? "upload.bin";
        const type = /Content-Type:\s*([^\r\n]+)/i.exec(rawHeaders)?.[1]?.trim();
        // Тело части заканчивается CRLF перед следующим boundary.
        const body = part.subarray(headerEnd + 4, part.length - 2);
        return { filename, type: type ?? "application/octet-stream", body };
      }
    }
    index = next;
  }
  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  let pathname = decodeURIComponent(url.pathname);
  const method = (req.method ?? "GET").toUpperCase();
  const cookies = parseCookies(req.headers.cookie ?? "");
  const setCookies = [];

  const send = (code, payload, headers = {}) => {
    const body = payload === undefined ? "" : JSON.stringify(payload);
    const out = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    };
    if (setCookies.length) out["Set-Cookie"] = setCookies;
    res.writeHead(code, out);
    res.end(body);
  };

  const issueCsrf = () => {
    const token = cookies[CSRF_COOKIE] || newCsrfToken();
    setCookies.push(`${CSRF_COOKIE}=${token}; Path=/; SameSite=Lax`);
    cookies[CSRF_COOKIE] = token;
    return token;
  };

  try {
    /* ---------------- статика: картинки товаров ---------------- */
    if (method === "GET" && pathname.startsWith("/products/")) {
      const file = path.join(PUBLIC_DIR, path.normalize(pathname).replace(/^(\.\.[/\\])+/, ""));
      if (file.startsWith(PUBLIC_DIR) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        const ext = path.extname(file).toLowerCase();
        const type =
          { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" }[ext] ??
          "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": type,
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        res.end(fs.readFileSync(file));
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    /* ---------------- APPEND_SLASH ---------------- */
    const isFile = /\.[a-z0-9]{2,5}$/i.test(pathname);
    if (
      pathname.startsWith("/api") &&
      !pathname.endsWith("/") &&
      !NO_SLASH.has(pathname) &&
      !isFile
    ) {
      res.writeHead(301, { Location: `${pathname}/${url.search}` });
      res.end();
      return;
    }
    if (pathname.length > 1 && pathname.endsWith("/") && !NO_SLASH.has(pathname)) {
      pathname = pathname.slice(0, -1);
    }

    const rawBody = ["GET", "HEAD"].includes(method) ? Buffer.alloc(0) : await readBody(req);
    const contentType = req.headers["content-type"] ?? "";
    const isMultipart = contentType.includes("multipart/form-data");
    let body = {};
    if (!isMultipart && rawBody.length) {
      try {
        body = JSON.parse(rawBody.toString("utf8"));
      } catch {
        return send(400, { detail: "Ожидается корректный JSON в теле запроса" });
      }
    }

    const token = cookies[SESSION_COOKIE] ?? null;
    const user = findUserByToken(token);

    // CSRF на всех небезопасных методах, кроме публичного превью корзины.
    const csrfExempt = pathname === "/api/orders" && method === "PUT";
    if (!csrfExempt) {
      assertCsrf(method, cookies[CSRF_COOKIE], req.headers["x-csrftoken"]);
    }

    const shopOf = (u) => (u ? getDb().sellers.find((s) => s.owner_id === u.id) ?? null : null);
    const seg = pathname.split("/").filter(Boolean); // ["api", ...]

    /* ---------------- service ---------------- */
    if (pathname === "/api/health" && method === "GET") {
      const db = getDb();
      return send(200, {
        status: "ok",
        service: "uzum-market-clone",
        backend: "mock",
        products: db.products.filter((p) => p.status === "active").length,
        time: new Date().toISOString(),
      });
    }

    if (pathname === "/api/demo/reset" && method === "POST") {
      requireUser(token);
      resetDb();
      return send(200, { detail: "Демо-данные восстановлены" });
    }

    /* ---------------- auth ---------------- */
    if (pathname === "/api/auth/csrf" && method === "GET") {
      return send(200, { detail: "CSRF cookie issued", csrf: issueCsrf() });
    }

    if (pathname === "/api/auth/register" && method === "POST") {
      const created = registerUser(body);
      issueCsrf();
      setCookies.push(
        `${SESSION_COOKIE}=${createSession(created.id)}; Path=/; SameSite=Lax; HttpOnly; Max-Age=604800`,
      );
      return send(201, publicUser(created));
    }

    if (pathname === "/api/auth/login" && method === "POST") {
      const found = loginUser(body.email, body.password);
      issueCsrf();
      setCookies.push(
        `${SESSION_COOKIE}=${createSession(found.id)}; Path=/; SameSite=Lax; HttpOnly; Max-Age=604800`,
      );
      return send(200, publicUser(found));
    }

    if (pathname === "/api/auth/logout" && method === "POST") {
      destroySession(token);
      setCookies.push(`${SESSION_COOKIE}=; Path=/; SameSite=Lax; HttpOnly; Max-Age=0`);
      return send(200, { detail: "Вы вышли из аккаунта" });
    }

    if (pathname === "/api/auth/me") {
      if (method === "GET") {
        // Анонимный запрос — это «гость», а не сбой: 401 с detail.
        if (!user) return send(401, { detail: "Вы не авторизованы" });
        return send(200, publicUser(user));
      }
      if (method === "PATCH") {
        return send(200, publicUser(updateProfile(requireUser(token).id, body)));
      }
    }

    if (pathname === "/api/auth/password" && method === "POST") {
      changePassword(requireUser(token).id, body.current, body.next);
      return send(200, { detail: "Пароль обновлён" });
    }

    /* ---------------- справочники ---------------- */
    if (pathname === "/api/categories" && method === "GET") {
      return send(200, envelope(listCategories()));
    }
    if (pathname === "/api/sellers" && method === "GET") {
      return send(200, envelope(listSellers()));
    }
    if (seg[1] === "sellers" && seg.length === 3 && method === "GET") {
      const seller = getSellerBySlugOrId(seg[2]);
      if (!seller) return send(404, { detail: "Магазин не найден" });
      return send(200, seller);
    }

    /* ---------------- товары ---------------- */
    if (pathname === "/api/products/mine" && method === "GET") {
      const me = requireUser(token);
      const shop = shopOf(me);
      if (!shop) return send(200, { detail: "У вас пока нет магазина", results: [] });
      return send(200, envelope(sellerProducts(shop.id)));
    }

    if (pathname === "/api/products") {
      if (method === "GET") {
        const query = productQueryFromUrl(url);
        query.viewerId = user?.id ?? null;
        // Чужие черновики наружу не отдаём: без своего магазина — пустой список.
        if (query.status && query.status !== "active") {
          const shop = shopOf(user);
          if (!shop) {
            return send(200, {
              ...envelope([]),
              page_size: 20,
              facets: { price: { min: 0, max: 0 }, categories: [] },
            });
          }
          query.seller = String(shop.id);
        }
        return send(200, listProducts(query));
      }
      if (method === "POST") {
        const id = createProduct(requireUser(token).id, body);
        return send(201, { id, detail: "Товар опубликован" });
      }
    }

    if (seg[1] === "products" && seg.length >= 3) {
      const key = seg[2];
      const tail = seg[3];

      if (!tail) {
        if (method === "GET") {
          const product = getProductByIdOrSlug(key, user?.id ?? null);
          if (!product) return send(404, { detail: "Товар не найден" });
          return send(200, product);
        }
        if (method === "PATCH") {
          const id = updateProduct(requireUser(token).id, Number(key), body);
          return send(200, { id, detail: "Изменения сохранены" });
        }
        if (method === "DELETE") {
          deleteProduct(requireUser(token).id, Number(key));
          return send(200, { detail: "Товар удалён" });
        }
      }

      if (tail === "status" && method === "POST") {
        setProductStatus(requireUser(token).id, Number(key), body.status);
        return send(200, { detail: "Статус обновлён" });
      }
      if (tail === "view" && method === "POST") {
        addView(Number(key));
        return send(200, { ok: true });
      }
      if (tail === "reviews") {
        const product = getProductByIdOrSlug(key, user?.id ?? null);
        if (!product) return send(404, { detail: "Товар не найден" });
        if (method === "GET") return send(200, listReviews(product.id, user?.id ?? null));
        if (method === "POST") {
          const result = upsertReview(requireUser(token).id, product.id, body);
          return send(result.updated ? 200 : 201, {
            ...result,
            detail: result.updated ? "Отзыв обновлён" : "Спасибо за отзыв!",
          });
        }
      }
    }

    /* ---------------- отзывы ---------------- */
    if (seg[1] === "reviews" && seg.length >= 3) {
      const reviewId = Number(seg[2]);
      if (!seg[3] && method === "DELETE") {
        deleteReview(requireUser(token).id, reviewId);
        return send(200, { detail: "Отзыв удалён" });
      }
      if (seg[3] === "reply" && method === "POST") {
        replyToReview(requireUser(token).id, reviewId, body.reply);
        return send(200, { detail: "Ответ опубликован" });
      }
    }

    /* ---------------- заказы ---------------- */
    if (pathname === "/api/orders") {
      // Превью сумм — публичное, без авторизации и без CSRF.
      if (method === "PUT") {
        return send(
          200,
          calcOrderTotals(
            toNumber(body.subtotal, 0),
            body.delivery_method === "pickup" ? "pickup" : "courier",
            body.promo_code,
          ),
        );
      }
      if (method === "GET") {
        const results = listOrders(requireUser(token).id);
        return send(200, { count: results.length, results });
      }
      if (method === "POST") {
        const id = createOrder(requireUser(token).id, body);
        return send(201, { id, detail: "Заказ оформлен" });
      }
    }

    if (seg[1] === "orders" && seg.length >= 3) {
      const orderId = Number(seg[2]);
      if (!seg[3] && method === "GET") {
        const me = requireUser(token);
        const order = getOrderForUser(orderId, me.id);
        if (!order) return send(404, { detail: "Заказ не найден" });
        return send(200, order);
      }
      if (seg[3] === "status" && method === "POST") {
        const status = advanceOrder(requireUser(token).id, orderId, body.action ?? "advance");
        return send(200, { status, detail: "Статус заказа обновлён" });
      }
    }

    /* ---------------- магазин продавца ---------------- */
    if (pathname === "/api/shop/orders" && method === "GET") {
      const shop = shopOf(requireUser(token));
      if (!shop) return send(200, { count: 0, results: [], stats: null });
      const results = sellerOrders(shop.id);
      return send(200, { count: results.length, results, stats: sellerStats(shop.id) });
    }

    if (pathname === "/api/shop") {
      const me = requireUser(token);
      if (method === "GET") {
        const shop = shopOf(me);
        // Магазина нет — это 200 с телом null, а не 404.
        return send(200, shop ? serializeSeller(getDb(), shop) : null);
      }
      if (method === "POST") {
        const id = ensureShopForUser(me.id, body.name ?? "Мой магазин");
        return send(201, { id, detail: "Магазин создан" });
      }
      if (method === "PATCH") {
        const id = updateShop(me.id, body);
        return send(200, { id, detail: "Данные магазина сохранены" });
      }
    }

    /* ---------------- загрузки ---------------- */
    if (pathname === "/api/uploads" && method === "POST") {
      requireUser(token);
      const part = parseMultipart(rawBody, contentType);
      if (!part) return send(400, { detail: "Файл не получен (поле file)" });
      const file = new File([part.body], part.filename, { type: part.type });
      const uploaded = await saveUpload(file);
      return send(201, { url: uploaded, name: part.filename });
    }

    if (seg[1] === "uploads" && seg.length === 3 && method === "GET") {
      const stored = readUpload(seg[2]);
      if (!stored) return send(404, { detail: "Файл не найден" });
      res.writeHead(200, {
        "Content-Type": stored.type,
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      res.end(stored.body);
      return;
    }

    return send(404, { detail: "Not found" });
  } catch (error) {
    if (error instanceof ApiError) {
      const payload = { detail: error.message };
      if (error.fields) payload.fields = error.fields;
      res.writeHead(error.status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ...(setCookies.length ? { "Set-Cookie": setCookies } : {}),
      });
      res.end(JSON.stringify(payload));
      return;
    }
    console.error("[mock-backend]", error);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ detail: "На сервере что-то сломалось" }));
  }
});

server.listen(PORT, HOST, () => {
  // Строку ждёт tests/helpers.mjs, чтобы понять, что мок готов.
  console.log(`Mock Uzum backend: http://${HOST}:${PORT}`);
});

// Тесты гасят мок сигналом — закрываемся без грязных сокетов.
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

export { server, saveDb };
