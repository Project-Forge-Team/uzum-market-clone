/**
 * Серверный API-слой для Server Components (RSC).
 *
 * Фронт больше не читает локальную «БД»: все данные приходят с бэкенда
 * (Django, см. docs/BACKEND_SPEC.md). Браузерные запросы ходят на same-origin
 * /api/* через прокси app/api/[...path]/route.ts, а серверные компоненты
 * обращаются к бэкенду напрямую (fetch + проброс куки сессии), чтобы у
 * has_own_review / own / can_review была правдивая личность зрителя.
 *
 * Адрес берётся из BACKEND_URL (по умолчанию — прод-бэкенд на Render).
 * Для локальной разработки и npm test поднимается тестовый бэкенд
 * (tests/local-backend) и BACKEND_URL указывает на него.
 */
import { cookies } from "next/headers";
import type {
  Category,
  Product,
  Review,
  ReviewSummary,
  Seller,
  SellerStats,
  ShopOrder,
  UserProfile,
} from "@/types/product";

const BACKEND_ORIGIN = (
  process.env.BACKEND_URL ?? "https://backend-uzum-market.onrender.com"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");
const BACKEND_API = `${BACKEND_ORIGIN}/api`;

export class ServerApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ServerApiError";
    this.status = status;
    this.fields = fields;
  }
}

/** Envelope списка — ровно как в ТЗ (§1.1), next/previous — boolean. */
export interface ListEnvelope<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: boolean;
  previous: boolean;
  results: T[];
}

export interface ProductQuery {
  q?: string;
  /** Выбрать конкретные товары по id (корзина, избранное). */
  ids?: number[] | string;
  category?: string | number;
  seller?: string | number;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  discounted?: boolean;
  in_stock?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
  status?: "active" | "draft" | "archived";
  /**
   * Совместимость со старой сигнатурой: личность зрителя теперь несёт кука
   * сессии, которую прокидываем на бэкенд — параметр не используется.
   */
  viewerId?: number | null;
}

export interface ProductListResult {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: boolean;
  previous: boolean;
  results: Product[];
  facets: {
    price: { min: number; max: number };
    categories: Array<Category & { product_count: number }>;
  };
}

export interface ProductReviewsResponse {
  summary: ReviewSummary;
  results: Review[];
  can_review: boolean;
  purchases: number;
}

export interface SellerCard extends Seller {
  order_count: number;
  created_at: string;
}

interface FetchOptions {
  /** Для публичных (не зависящих от пользователя) данных. */
  revalidate?: number;
}

async function readSessionCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get("uzum_sessionid")?.value ?? null;
  } catch {
    // Вне request-контекста (предгенерация, статика) — без сессии.
    return null;
  }
}

/**
 * Fetch к API бэкенда. Кука сессии прокидывается, чтобы пользовательские
 * поля (has_own_review, own, can_review) считались для правильного зрителя.
 * 401/404 — не исключение, а состояние: apiOrNull вернёт null.
 */
async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  const session = await readSessionCookie();
  if (session) headers.set("cookie", `uzum_sessionid=${session}`);

  const res = await fetch(`${BACKEND_API}${path}`, {
    headers,
    // revalidate: 0 — без кэша (личные данные); N секунд — публичные списки.
    next: { revalidate: options.revalidate ?? 0 },
  });

  if (!res.ok) throw await toServerApiError(res);

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function toServerApiError(res: Response): Promise<ServerApiError> {
  let detail = `Запрос к серверу не удался (${res.status})`;
  let fields: Record<string, string> | undefined;
  try {
    const data = (await res.json()) as {
      detail?: unknown;
      fields?: Record<string, string>;
    };
    if (typeof data.detail === "string" && data.detail) detail = data.detail;
    fields = data.fields;
  } catch {
    /* тело не JSON — оставляем дефолтный текст */
  }
  return new ServerApiError(res.status, detail, fields);
}

/** Тот же запрос, но 401 (гость) и 404 (нет сущности) → null, а не ошибка. */
async function apiOrNull<T>(path: string, options: FetchOptions = {}): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch (err) {
    if (err instanceof ServerApiError && (err.status === 401 || err.status === 404)) {
      return null;
    }
    throw err;
  }
}

function queryFrom(params: ProductQuery): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || key === "viewerId") continue;
    if (key === "ids") {
      const ids = Array.isArray(value) ? value : String(value).split(",");
      const clean = ids
        .map((v) => Number(String(v).trim()))
        .filter((v) => Number.isFinite(v) && v > 0);
      if (clean.length) search.set("ids", clean.join(","));
      continue;
    }
    if (typeof value === "boolean") {
      if (value) search.set(key, "1");
      continue;
    }
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/* ------------------------------------------------------------------ */
/*  Авторизация                                                        */
/* ------------------------------------------------------------------ */

/** Текущий пользователь по куке сессии; гость — null (401 не ошибка). */
export async function getCurrentUser(): Promise<UserProfile | null> {
  return apiOrNull<UserProfile>("/auth/me/");
}

/**
 * Совместимость со старой сигнатурой: бэкенд уже отдаёт публичный профиль
 * (UserProfile), вырезывать хэши не нужно.
 */
export function publicUser(user: UserProfile): UserProfile {
  return user;
}

/** Магазин текущего пользователя: 200 с телом null, если магазина нет. */
export async function getMyShop(): Promise<Seller | null> {
  return apiOrNull<Seller>("/shop/");
}

/* ------------------------------------------------------------------ */
/*  Товары                                                             */
/* ------------------------------------------------------------------ */

export async function listProducts(query: ProductQuery = {}): Promise<ProductListResult> {
  return apiFetch<ProductListResult>(`/products/${queryFrom(query)}`);
}

export async function getProductByIdOrSlug(
  idOrSlug: string | number,
  _viewerId?: number | null,
  _options?: { includeHidden?: boolean },
): Promise<Product | null> {
  // Черновик/архив бэкенд отдаёт только владельцу (кука сессии), остальным
  // отвечает 404 — ровно как на витрине.
  return apiOrNull<Product>(`/products/${encodeURIComponent(String(idOrSlug))}/`);
}

/** «Похожие товары»: та же категория или тот же продавец, без самого товара. */
export async function relatedProducts(product: Product, limit = 10): Promise<Product[]> {
  const [byCategory, bySeller] = await Promise.all([
    product.category
      ? apiFetch<ListEnvelope<Product>>(
          `/products/?category=${product.category.id}&page_size=60`,
        )
      : Promise.resolve(null),
    product.seller
      ? apiFetch<ListEnvelope<Product>>(
          `/products/?seller=${product.seller.id}&page_size=60`,
        )
      : Promise.resolve(null),
  ]);

  const unique = new Map<number, Product>();
  for (const list of [byCategory, bySeller]) {
    for (const item of list?.results ?? []) {
      if (item.id !== product.id) unique.set(item.id, item);
    }
  }

  const sameCategory = (p: Product) =>
    p.category?.id === product.category?.id ? 1 : 0;
  return [...unique.values()]
    .sort(
      (a, b) =>
        sameCategory(b) - sameCategory(a) || b.rating - a.rating,
    )
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/*  Категории и магазины                                               */
/* ------------------------------------------------------------------ */

export async function listCategories(): Promise<
  Array<Category & { product_count: number }>
> {
  const envelope = await apiFetch<
    ListEnvelope<Category & { product_count: number }>
  >("/categories/", { revalidate: 60 });
  return envelope.results;
}

export async function getCategoryBySlugOrId(
  key: string | number,
): Promise<(Category & { product_count: number }) | null> {
  const s = String(key);
  const categories = await listCategories();
  return (
    categories.find((c) => String(c.id) === s || c.slug === s) ?? null
  );
}

export async function listSellers(): Promise<SellerCard[]> {
  const envelope = await apiFetch<ListEnvelope<SellerCard>>("/sellers/", {
    revalidate: 60,
  });
  return envelope.results;
}

export async function getSellerBySlugOrId(
  key: string | number,
): Promise<(Seller & { created_at: string; products: Product[] }) | null> {
  return apiOrNull<Seller & { created_at: string; products: Product[] }>(
    `/sellers/${encodeURIComponent(String(key))}/`,
  );
}

/* ------------------------------------------------------------------ */
/*  Отзывы                                                             */
/* ------------------------------------------------------------------ */

export async function listReviews(
  productId: number,
  _viewerId?: number | null,
): Promise<ProductReviewsResponse> {
  return apiFetch<ProductReviewsResponse>(`/products/${productId}/reviews/`);
}

/**
 * «Мои отзывы» через контракт ТЗ: свои заказы → купленные товары → отзывы с
 * own=true. Таблицы «мои отзывы» в API нет, собираем из того, что есть.
 */
export async function myReviews(
  _userId: number,
): Promise<Array<Review & { product: Product }>> {
  const orders = await apiFetch<ListEnvelope<ShopOrder>>("/orders/");
  const productIds = [
    ...new Set(orders.results.flatMap((o) => o.items.map((i) => i.product_id))),
  ];

  const rows: Array<Review & { product: Product }> = [];
  await Promise.all(
    productIds.map(async (productId) => {
      const [product, reviews] = await Promise.all([
        apiOrNull<Product>(`/products/${productId}/`),
        apiOrNull<ProductReviewsResponse>(`/products/${productId}/reviews/`),
      ]);
      if (!product) return;
      for (const review of reviews?.results ?? []) {
        if (review.own) rows.push({ ...review, product });
      }
    }),
  );

  return rows.sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
}

/* ------------------------------------------------------------------ */
/*  Кабинет продавца                                                   */
/* ------------------------------------------------------------------ */

/** Все товары магазина владельца куки: active + draft + archived. */
export async function sellerProducts(_sellerId: number): Promise<Product[]> {
  const envelope = await apiFetch<ListEnvelope<Product>>("/products/mine/");
  return envelope.results;
}

interface ShopOrdersEnvelope extends ListEnvelope<ShopOrder> {
  stats?: SellerStats;
}

export async function sellerOrders(_sellerId: number): Promise<ShopOrder[]> {
  const envelope = await apiFetch<ShopOrdersEnvelope>("/shop/orders/");
  return envelope.results;
}

/**
 * Статистика магазина. Своё (кука владельца) — точные цифры из кабинета
 * (/shop/orders/); чужой магазин или гость — публичный фолбэк из открытых
 * эндпоинтов, потому что витрина /shop/{slug} доступна всем.
 */
export async function sellerStats(sellerId: number): Promise<SellerStats> {
  const myShop = await apiOrNull<Seller>("/shop/");
  if (myShop && myShop.id === sellerId) {
    const envelope = await apiFetch<ShopOrdersEnvelope>("/shop/orders/");
    if (envelope.stats) return envelope.stats;
  }

  const [sellers, detail] = await Promise.all([
    listSellers(),
    getSellerBySlugOrId(sellerId),
  ]);
  const card = sellers.find((s) => s.id === sellerId);
  const products = detail?.products ?? [];
  return {
    product_count: card?.product_count ?? products.length,
    draft_count: 0,
    review_count: card?.reviews_count ?? detail?.reviews_count ?? 0,
    rating: card?.rating ?? detail?.rating ?? 0,
    views: products.reduce((acc, p) => acc + p.views, 0),
    order_count: card?.order_count ?? 0,
    revenue: 0,
    stock_units: products.reduce((acc, p) => acc + p.stock, 0),
  };
}

/** Отзывы ко всем товарам магазина — для ответов в кабинете продавца. */
export async function sellerReviews(
  _sellerId: number,
): Promise<Array<Review & { product: { id: number; title: string; image: string } }>> {
  const mine = await apiFetch<ListEnvelope<Product>>("/products/mine/");
  const rows: Array<Review & { product: { id: number; title: string; image: string } }> = [];
  await Promise.all(
    mine.results.map(async (product) => {
      const reviews = await apiOrNull<ProductReviewsResponse>(
        `/products/${product.id}/reviews/`,
      );
      for (const review of reviews?.results ?? []) {
        rows.push({
          ...review,
          product: { id: product.id, title: product.title, image: product.image },
        });
      }
    }),
  );
  return rows.sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
}

/* ------------------------------------------------------------------ */
/*  Заказы                                                             */
/* ------------------------------------------------------------------ */

export async function listOrders(_userId: number): Promise<ShopOrder[]> {
  const envelope = await apiFetch<ListEnvelope<ShopOrder>>("/orders/");
  return envelope.results;
}

/** Заказ текущего пользователя: 401 (гость) / 404 (чужой) → null. */
export async function getOrderForUser(
  orderId: number,
  _userId: number,
): Promise<ShopOrder | null> {
  return apiOrNull<ShopOrder>(`/orders/${orderId}/`);
}

/* ------------------------------------------------------------------ */
/*  Служебное                                                          */
/* ------------------------------------------------------------------ */

/** Публичная статистика для лендинга «Стать продавцом» и главной. */
export async function marketplaceStats(): Promise<{
  products: number;
  categories: number;
  sellers: number;
  reviews: number;
}> {
  const [products, sellers, categories] = await Promise.all([
    apiFetch<ListEnvelope<Product>>("/products/?page_size=120", { revalidate: 60 }),
    apiFetch<ListEnvelope<SellerCard>>("/sellers/", { revalidate: 60 }),
    apiFetch<ListEnvelope<Category & { product_count: number }>>("/categories/", {
      revalidate: 60,
    }),
  ]);
  return {
    products: products.count,
    categories: categories.count,
    sellers: sellers.count,
    reviews: products.results.reduce((acc, p) => acc + p.reviews_count, 0),
  };
}
