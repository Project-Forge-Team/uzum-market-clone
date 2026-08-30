/**
 * Полный локальный бэкенд: тот же API-контракт, что и прод-бэкенд на Render
 * (docs/BACKEND_SPEC.md), на логике lib/server (файловая «БД» + сид).
 *
 * Зачем:
 *  - dev/превью без доступа к прод-бэкенду (у песочниц бывает закрытый
 *    исходящий трафик): BACKEND_URL=http://127.0.0.1:8000 npm run dev;
 *  - npm test (tests/run-node-tests.mjs): e2e-прогон полностью офлайн —
 *    приложение + прокси + бэкенд на одном контракте, без внешних сервисов.
 *
 * Приложение этот сервер НИКУДА не импортирует — это отдельный процесс.
 * HTTP-слой повторяет поведения, на которые рассчитан фронт:
 *  - трейлинг-слэш не важен (принимается и с, и без — Django APPEND_SLASH);
 *  - несколько Set-Cookie в одном ответе (кука сессии + CSRF);
 *  - CSRF double-submit: X-CSRFToken обязан совпадать с кукой uzum_csrf
 *    (PUT /api/orders — публичное превью корзины, CSRF не требует);
 *  - ошибки { detail, fields? }, 401 у /auth/me — «гость», 200 null у /shop/.
 *
 * Запуск: npx tsx tests/local-backend/server.mts
 *   порт: UZUM_BACKEND_PORT (по умолчанию 8000),
 *   база: UZUM_DB_DIR (по умолчанию .local-backend/data — не в git).
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertCsrf,
  clearSessionCookie,
  createSession,
  destroySession,
  getCurrentUser,
  issueCsrfCookie,
  loginUser,
  publicUser,
  readSessionToken,
  registerUser,
  requireUser,
  runWithRequestContext,
  setSessionCookie,
  updateProfile,
  type RequestLike,
} from "../../lib/server/auth";
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
  resetDemoData,
  saveUpload,
  setProductStatus,
  updateProduct,
  updateShop,
  upsertReview,
} from "../../lib/server/actions";
import {
  getProductByIdOrSlug,
  getOrderForUser,
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
} from "../../lib/server/catalog";
import { getDb, peekDb } from "../../lib/server/db";
import {
  fail,
  json,
  productQueryFromUrl,
  readJson,
  toNumber,
  type ApiResponse,
} from "../../lib/server/http";

const PORT = Number(process.env.UZUM_BACKEND_PORT ?? 8000);
const HOST = process.env.UZUM_BACKEND_HOST ?? "127.0.0.1";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/* ------------------------------------------------------------------ */
/*  Разбор запроса                                                     */
/* ------------------------------------------------------------------ */

interface ParsedRequest {
  method: string;
  /** Нормализованный путь без префикса /api и без трейлинг-слэша. */
  route: string;
  url: URL;
  headers: { get(name: string): string | null };
  cookies: Record<string, string>;
  body: Buffer;
  contentType: string;
  /** Совместимость со слоем lib/server (readJson). */
  text(): Promise<string>;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    if (name) out[name] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Минимальный multipart-парсер: ищем одно поле file. */
function parseMultipartFile(
  body: Buffer,
  contentType: string,
): { name: string; type: string; data: Buffer } | null {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary = boundaryMatch ? (boundaryMatch[1] ?? boundaryMatch[2]) : null;
  if (!boundary) return null;
  const delim = Buffer.from(`--${boundary}`);
  let idx = body.indexOf(delim);
  while (idx !== -1) {
    const next = body.indexOf(delim, idx + delim.length);
    if (next === -1) break;
    const part = body.subarray(idx + delim.length, next);
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const headersText = part.subarray(0, headerEnd).toString();
      const disposition = /Content-Disposition:[^\r\n]*/i.exec(headersText)?.[0] ?? "";
      const name = /name="([^"]*)"/.exec(disposition)?.[1];
      const filename = /filename="([^"]*)"/.exec(disposition)?.[1];
      const type = /Content-Type:\s*([^\r\n]+)/i.exec(headersText)?.[1]?.trim();
      if (name === "file" && filename) {
        let content = part.subarray(headerEnd + 4);
        if (content.length >= 2 && content.subarray(-2).toString() === "\r\n") {
          content = content.subarray(0, content.length - 2);
        }
        return { name: filename, type: type ?? "application/octet-stream", data: Buffer.from(content) };
      }
    }
    idx = next;
  }
  return null;
}

async function parseRequest(req: IncomingMessage): Promise<ParsedRequest> {
  const rawUrl = `http://localhost${req.url ?? "/"}`;
  const url = new URL(rawUrl);
  const fullRoute = url.pathname.replace(/^\/api\/?/, "");
  const route = fullRoute.replace(/\/+$/, "");
  const body = await readBody(req);
  const contentType = req.headers["content-type"] ?? "";
  const headerMap = req.headers;
  return {
    method: (req.method ?? "GET").toUpperCase(),
    route,
    url,
    headers: {
      get: (name: string) => headerMap[name.toLowerCase()]?.toString() ?? null,
    },
    cookies: parseCookies(req.headers.cookie),
    body,
    contentType,
    text: async () => body.toString("utf8"),
  };
}

/** Обёртка над RequestLike для assertCsrf (нужны method + headers). */
function requestLike(req: ParsedRequest): RequestLike {
  return { method: req.method, headers: req.headers };
}

function send(res: ServerResponse, api: ApiResponse, setCookies: string[]) {
  res.statusCode = api.status;
  for (const [name, value] of Object.entries(api.headers)) {
    res.setHeader(name, value);
  }
  if (setCookies.length) res.setHeader("set-cookie", setCookies);
  res.end(api.body);
}

/* ------------------------------------------------------------------ */
/*  Роуты                                                              */
/* ------------------------------------------------------------------ */

type Handler = (req: ParsedRequest, params: Record<string, string>) => Promise<ApiResponse>;

const routes: Array<{ method: string; pattern: RegExp; handler: Handler }> = [
  // --- служебное ---
  {
    method: "GET",
    pattern: /^health$/,
    handler: async () => {
      const db = peekDb();
      const products = db ? db.products.filter((p) => p.status === "active").length : -1;
      return json({
        status: "ok",
        service: "uzum-market-clone",
        backend: "local",
        products,
        time: new Date().toISOString(),
      });
    },
  },

  // --- auth ---
  {
    method: "GET",
    pattern: /^auth\/csrf$/,
    handler: async () => {
      const token = await issueCsrfCookie();
      return json({ detail: "CSRF cookie issued", csrf: token });
    },
  },
  {
    method: "POST",
    pattern: /^auth\/login$/,
    handler: async (req) => {
      await assertCsrf(requestLike(req));
      const body = await readJson<{ email: string; password: string }>(req);
      const user = loginUser(body.email, body.password);
      await issueCsrfCookie();
      await setSessionCookie(createSession(user.id));
      return json(publicUser(user));
    },
  },
  {
    method: "POST",
    pattern: /^auth\/register$/,
    handler: async (req) => {
      await assertCsrf(requestLike(req));
      const body = await readJson<{
        email: string;
        password: string;
        password2: string;
        first_name: string;
        last_name?: string;
        phone?: string;
        shop_name?: string;
      }>(req);
      const user = registerUser({
        ...body,
        last_name: body.last_name ?? "",
        phone: body.phone ?? "",
      });
      await issueCsrfCookie();
      await setSessionCookie(createSession(user.id));
      return json(publicUser(user), { status: 201 });
    },
  },
  {
    method: "POST",
    pattern: /^auth\/logout$/,
    handler: async () => {
      destroySession(await readSessionToken());
      await clearSessionCookie();
      return json({ detail: "Вы вышли из аккаунта" });
    },
  },
  {
    method: "GET",
    pattern: /^auth\/me$/,
    handler: async () => {
      const user = await getCurrentUser();
      if (!user) return json({ detail: "Вы не авторизованы" }, { status: 401 });
      return json(publicUser(user));
    },
  },
  {
    method: "PATCH",
    pattern: /^auth\/me$/,
    handler: async (req) => {
      const user = await requireUser();
      const body = await readJson<{
        first_name?: string;
        last_name?: string;
        phone?: string;
        email?: string;
      }>(req);
      return json(publicUser(updateProfile(user.id, body)));
    },
  },
  {
    method: "POST",
    pattern: /^auth\/password$/,
    handler: async (req) => {
      await assertCsrf(requestLike(req));
      const user = await requireUser();
      const body = await readJson<{ current: string; next: string }>(req);
      changePassword(user.id, body.current, body.next);
      return json({ detail: "Пароль обновлён" });
    },
  },

  // --- справочники ---
  {
    method: "GET",
    pattern: /^categories$/,
    handler: async () => {
      const results = listCategories();
      return json({
        count: results.length,
        page: 1,
        page_size: results.length,
        total_pages: 1,
        next: false,
        previous: false,
        results,
      });
    },
  },
  {
    method: "GET",
    pattern: /^sellers$/,
    handler: async () => {
      const results = listSellers();
      return json({
        count: results.length,
        page: 1,
        page_size: results.length,
        total_pages: 1,
        next: false,
        previous: false,
        results,
      });
    },
  },
  {
    method: "GET",
    pattern: /^sellers\/([^/]+)$/,
    handler: async (_req, params) => {
      const seller = getSellerBySlugOrId(params.key);
      if (!seller) return json({ detail: "Магазин не найден" }, { status: 404 });
      return json(seller);
    },
  },

  // --- товары ---
  {
    method: "GET",
    pattern: /^products$/,
    handler: async (req) => {
      const user = await getCurrentUser();
      const query = productQueryFromUrl(req.url);
      query.viewerId = user?.id ?? null;

      // Черновик и архив — внутренняя кухня продавца: чужим показываем пустое.
      if (query.status && query.status !== "active") {
        const shop = user ? getDb().sellers.find((s) => s.owner_id === user.id) : null;
        if (!shop) {
          return json({
            count: 0,
            page: 1,
            page_size: 0,
            total_pages: 1,
            next: false,
            previous: false,
            results: [],
          });
        }
        query.seller = String(shop.id);
      }
      return json(listProducts(query));
    },
  },
  {
    method: "POST",
    pattern: /^products$/,
    handler: async (req) => {
      await assertCsrf(requestLike(req));
      const user = await requireUser();
      const body = await readJson<Record<string, unknown>>(req);
      const id = createProduct(user.id, body as never);
      return json({ id, detail: "Товар опубликован" }, { status: 201 });
    },
  },
  {
    method: "GET",
    pattern: /^products\/mine$/,
    handler: async () => {
      const user = await requireUser();
      const seller = getDb().sellers.find((s) => s.owner_id === user.id);
      if (!seller) {
        return json({ detail: "У вас пока нет магазина", results: [] });
      }
      const results = sellerProducts(seller.id);
      return json({
        count: results.length,
        page: 1,
        page_size: results.length,
        total_pages: 1,
        next: false,
        previous: false,
        results,
      });
    },
  },
  {
    method: "GET",
    pattern: /^products\/([^/]+)$/,
    handler: async (_req, params) => {
      const user = await getCurrentUser();
      const product = getProductByIdOrSlug(params.key, user?.id ?? null);
      if (!product) return json({ detail: "Товар не найден" }, { status: 404 });
      return json(product);
    },
  },
  {
    method: "PATCH",
    pattern: /^products\/([^/]+)$/,
    handler: async (req, params) => {
      await assertCsrf(requestLike(req));
      const user = await requireUser();
      const body = await readJson<Record<string, unknown>>(req);
      const productId = updateProduct(user.id, Number(params.key), body as never);
      return json({ id: productId, detail: "Изменения сохранены" });
    },
  },
  {
    method: "DELETE",
    pattern: /^products\/([^/]+)$/,
    handler: async (req, params) => {
      await assertCsrf(requestLike(req));
      const user = await requireUser();
      deleteProduct(user.id, Number(params.key));
      return json({ detail: "Товар удалён" });
    },
  },
  {
    method: "POST",
    pattern: /^products\/([^/]+)\/status$/,
    handler: async (req, params) => {
      const user = await requireUser();
      const body = await readJson<{ status: "active" | "draft" | "archived" }>(req);
      setProductStatus(user.id, Number(params.key), body.status);
      return json({ detail: "Статус обновлён" });
    },
  },
  {
    method: "POST",
    pattern: /^products\/([^/]+)\/view$/,
    handler: async (_req, params) => {
      addView(Number(params.key));
      return json({ ok: true });
    },
  },
  {
    method: "GET",
    pattern: /^products\/([^/]+)\/reviews$/,
    handler: async (_req, params) => {
      const user = await getCurrentUser();
      return json(listReviews(Number(params.key), user?.id ?? null));
    },
  },
  {
    method: "POST",
    pattern: /^products\/([^/]+)\/reviews$/,
    handler: async (req, params) => {
      await assertCsrf(requestLike(req));
      const user = await requireUser();
      const body = await readJson<{
        rating: number;
        text: string;
        pros?: string;
        cons?: string;
      }>(req);
      const result = upsertReview(user.id, Number(params.key), body);
      return json(
        { ...result, detail: result.updated ? "Отзыв обновлён" : "Спасибо за отзыв!" },
        { status: result.updated ? 200 : 201 },
      );
    },
  },

  // --- отзывы ---
  {
    method: "DELETE",
    pattern: /^reviews\/([^/]+)$/,
    handler: async (req, params) => {
      const user = await requireUser();
      deleteReview(user.id, Number(params.key));
      return json({ detail: "Отзыв удалён" });
    },
  },
  {
    method: "POST",
    pattern: /^reviews\/([^/]+)\/reply$/,
    handler: async (req, params) => {
      const user = await requireUser();
      const body = await readJson<{ reply: string }>(req);
      replyToReview(user.id, Number(params.key), body.reply);
      return json({ detail: "Ответ опубликован" });
    },
  },

  // --- заказы ---
  {
    method: "GET",
    pattern: /^orders$/,
    handler: async () => {
      const user = await requireUser();
      const results = listOrders(user.id);
      return json({ count: results.length, results });
    },
  },
  {
    method: "POST",
    pattern: /^orders$/,
    handler: async (req) => {
      await assertCsrf(requestLike(req));
      const user = await requireUser();
      const body = await readJson<Record<string, unknown>>(req);
      const id = createOrder(user.id, body as never);
      return json({ id, detail: "Заказ оформлен" }, { status: 201 });
    },
  },
  {
    method: "PUT",
    pattern: /^orders$/,
    handler: async (req) => {
      // Публичное превью суммы: без авторизации и без CSRF.
      const body = await readJson<{
        subtotal: number;
        delivery_method: "courier" | "pickup";
        promo_code?: string;
      }>(req);
      const totals = calcOrderTotals(
        toNumber(body.subtotal, 0),
        body.delivery_method === "pickup" ? "pickup" : "courier",
        body.promo_code,
      );
      return json(totals);
    },
  },
  {
    method: "GET",
    pattern: /^orders\/([^/]+)$/,
    handler: async (_req, params) => {
      const user = await getCurrentUser();
      if (!user) return json({ detail: "Нужно войти в аккаунт" }, { status: 401 });
      const order = getOrderForUser(Number(params.key), user.id);
      if (!order) return json({ detail: "Заказ не найден" }, { status: 404 });
      return json(order);
    },
  },
  {
    method: "POST",
    pattern: /^orders\/([^/]+)\/status$/,
    handler: async (req, params) => {
      await assertCsrf(requestLike(req));
      const user = await requireUser();
      const body = await readJson<{ action?: "advance" | "cancel" }>(req);
      const status = advanceOrder(user.id, Number(params.key), body.action ?? "advance");
      return json({ status, detail: "Статус заказа обновлён" });
    },
  },

  // --- магазин ---
  {
    method: "GET",
    pattern: /^shop$/,
    handler: async () => {
      const user = await requireUser();
      const seller = getDb().sellers.find((s) => s.owner_id === user.id);
      if (!seller) return json(null); // 200 с телом null — «магазина нет»
      return json(serializeSeller(getDb(), seller));
    },
  },
  {
    method: "POST",
    pattern: /^shop$/,
    handler: async (req) => {
      const user = await requireUser();
      const body = await readJson<{ name?: string }>(req);
      const id = ensureShopForUser(user.id, body.name ?? "Мой магазин");
      return json({ id, detail: "Магазин создан" }, { status: 201 });
    },
  },
  {
    method: "PATCH",
    pattern: /^shop$/,
    handler: async (req) => {
      const user = await requireUser();
      const body = await readJson<{
        name?: string;
        description?: string;
        city?: string;
      }>(req);
      updateShop(user.id, body);
      return json({ detail: "Данные магазина сохранены" });
    },
  },
  {
    method: "GET",
    pattern: /^shop\/orders$/,
    handler: async () => {
      const user = await requireUser();
      const seller = getDb().sellers.find((s) => s.owner_id === user.id);
      if (!seller) return json({ count: 0, results: [], stats: null });
      const results = sellerOrders(seller.id);
      return json({ count: results.length, results, stats: sellerStats(seller.id) });
    },
  },

  // --- медиа ---
  {
    method: "POST",
    pattern: /^uploads$/,
    handler: async (req) => {
      await assertCsrf(requestLike(req));
      await requireUser();
      const file = parseMultipartFile(req.body, req.contentType);
      if (!file) {
        return json({ detail: "Файл не получен (поле file)" }, { status: 400 });
      }
      // saveUpload ожидает File (Web API); копируем Buffer в ArrayBuffer.
      const bytes = new Uint8Array(file.data.length);
      bytes.set(file.data);
      const url = await saveUpload(new File([bytes], file.name, { type: file.type }));
      return json({ url, name: file.name }, { status: 201 });
    },
  },
  {
    method: "GET",
    pattern: /^uploads\/([^/]+)$/,
    handler: async (_req, params) => {
      const file = readUpload(decodeURIComponent(params.key));
      if (!file) return json({ detail: "Файл не найден" }, { status: 404 });
      return {
        status: 200,
        body: file.body,
        headers: {
          "Content-Type": file.type,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      };
    },
  },

  // --- демо ---
  {
    method: "POST",
    pattern: /^demo\/reset$/,
    handler: async () => {
      if (process.env.UZUM_LOCK_DEMO === "1") {
        return json({ detail: "Сброс отключён переменной UZUM_LOCK_DEMO" }, { status: 403 });
      }
      await requireUser();
      resetDemoData();
      return json({ detail: "Демо-данные восстановлены" });
    },
  },
];

// Статика: картинки сида (как у Django из MEDIA_ROOT).
const GEN_DIR = path.join(REPO_ROOT, "public", "products", "gen");
const GEN_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

/* ------------------------------------------------------------------ */
/*  Сервер                                                             */
/* ------------------------------------------------------------------ */

const server = createServer(async (req, res) => {
  try {
    const parsed = await parseRequest(req);

    // Картинки сида — напрямую из public/ (не через /api).
    if (parsed.route === "" && (req.url ?? "").startsWith("/products/gen/")) {
      const rel = (req.url ?? "").replace(/^\/products\/gen\//, "");
      const full = path.join(GEN_DIR, path.basename(rel));
      if (full.startsWith(GEN_DIR) && fs.existsSync(full)) {
        const type = GEN_TYPES[path.extname(full).toLowerCase()] ?? "application/octet-stream";
        res.setHeader("Content-Type", type);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.end(fs.readFileSync(full));
        return;
      }
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    if (parsed.route === "") {
      send(res, json({ detail: "API uzum-market-clone. Разделы: /health, /auth, /products…" }), []);
      return;
    }

    // Метод может не совпасть — тогда отдаём 405, как обычный сервер.
    const route = routes.find(
      (r) => r.method === parsed.method && r.pattern.test(parsed.route),
    );
    if (!route) {
      const anyMatch = routes.find((r) => r.pattern.test(parsed.route));
      send(
        res,
        json({ detail: anyMatch ? "Метод не поддерживается" : "Маршрут не найден" }, {
          status: anyMatch ? 405 : 404,
        }),
        [],
      );
      return;
    }

    const match = parsed.route.match(route.pattern);
    const params: Record<string, string> = {};
    if (match?.[1]) params.key = match[1];

    const setCookies: string[] = [];
    const api = await runWithRequestContext(
      {
        cookies: parsed.cookies,
        setCookie: (header) => setCookies.push(header),
      },
      async () => route.handler(parsed, params).catch((err) => fail(err)),
    );

    send(res, api, setCookies);
  } catch (err) {
    console.error("[local-backend]", err);
    send(res, fail(err), []);
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    `[local-backend] готов: http://${HOST}:${PORT}/api (база: ${
      process.env.UZUM_DB_DIR ?? ".local-backend/data"
    })`,
  );
});
