import "server-only";

/**
 * Серверный слой данных: всё, что Server Components берут у бэкенда.
 *
 * Раньше страницы читали локальный JSON (`lib/server/db.ts`). Теперь источник
 * один — Django на BACKEND_URL, а этот модуль:
 *  - прокидывает куку сессии из входящего запроса (иначе `own`,
 *    `has_own_review`, черновики и кабинет были бы «как для гостя»);
 *  - переводит 401/403/404 в понятные для страниц значения (`null`), а не в
 *    исключение — гость обязан видеть каталог, а не ошибку;
 *  - никогда не роняет страницу: если бэкенд лёг, отдаём пустые структуры,
 *    чтобы каркас, шапка и меню всё равно отрендерились.
 *
 * Все запросы — `no-store`: маркетплейс показывает остатки и цены, а кабинет
 * продавца обязан видеть свои черновики сразу после сохранения.
 */
import { cookies } from "next/headers";
import {
  BACKEND_TIMEOUT_MS,
  CSRF_COOKIE,
  SESSION_COOKIE,
  backendUrl,
} from "./backend";
import type {
  Category,
  Product,
  ProductListResponse,
  Review,
  ReviewSummary,
  Seller,
  SellerStats,
  ShopOrder,
  UserProfile,
} from "@/types/product";

/* ------------------------------------------------------------------ */
/*  Базовый запрос                                                     */
/* ------------------------------------------------------------------ */

export interface BackendResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

/** Заголовок Cookie с сессией текущего посетителя (или пустая строка). */
async function sessionCookieHeader(): Promise<string> {
  try {
    const store = await cookies();
    return [SESSION_COOKIE, CSRF_COOKIE]
      .map((name) => {
        const value = store.get(name)?.value;
        return value ? `${name}=${value}` : null;
      })
      .filter(Boolean)
      .join("; ");
  } catch {
    // Вне запроса (например, при сборке) куки недоступны — это нормально.
    return "";
  }
}

/**
 * GET к бэкенду от имени текущего пользователя.
 * Ошибки не бросаются: страницы сами решают, что показать при `null`.
 */
export async function backendGet<T>(
  path: string,
  search = "",
): Promise<BackendResult<T>> {
  const cookie = await sessionCookieHeader();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;

  try {
    const res = await fetch(backendUrl(path, search), {
      headers,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });

    if (res.status === 204) return { ok: true, status: 204, data: null };

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    return { ok: res.ok, status: res.status, data: (data as T) ?? null };
  } catch (error) {
    // Таймаут/сеть: логируем на сервере, но страницу не роняем.
    console.error(`[uzum ssr] GET ${path} —`, (error as Error)?.message);
    return { ok: false, status: 0, data: null };
  }
}

/** Удобная обёртка: только тело успешного ответа, иначе `null`. */
async function get<T>(path: string, search = ""): Promise<T | null> {
  const { ok, data } = await backendGet<T>(path, search);
  return ok ? data : null;
}

/* ------------------------------------------------------------------ */
/*  Пользователь                                                       */
/* ------------------------------------------------------------------ */

/**
 * Текущий пользователь. Анонимный `GET /auth/me/` отвечает 401 —
 * это не ошибка, а состояние «гость», поэтому возвращаем `null`.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const { ok, status, data } = await backendGet<UserProfile>("auth/me");
  if (status === 401) return null;
  return ok ? data : null;
}

/* ------------------------------------------------------------------ */
/*  Каталог                                                            */
/* ------------------------------------------------------------------ */

const EMPTY_LIST: ProductListResponse & {
  facets: NonNullable<ProductListResponse["facets"]>;
} = {
  count: 0,
  page: 1,
  page_size: 20,
  total_pages: 1,
  next: false,
  previous: false,
  results: [],
  facets: { price: { min: 0, max: 0 }, categories: [] },
};

export interface ProductQuery {
  q?: string;
  category?: string | number;
  seller?: string | number;
  min_price?: number | string;
  max_price?: number | string;
  min_rating?: number | string;
  discounted?: boolean;
  in_stock?: boolean;
  ordering?: string;
  page?: number | string;
  page_size?: number | string;
  status?: string;
  ids?: Array<number | string>;
}

/** Собирает query-строку, выкидывая пустые и «выключенные» значения. */
export function productSearch(query: ProductQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "ids") {
      const list = (value as Array<number | string>).filter(Boolean);
      if (list.length) params.set("ids", list.join(","));
      continue;
    }
    if (typeof value === "boolean") {
      if (value) params.set(key, "1");
      continue;
    }
    params.set(key, String(value));
  }
  return params.toString();
}

/** Витрина: список товаров + фасеты. При недоступном бэкенде — пустая. */
export async function listProducts(
  query: ProductQuery = {},
): Promise<ProductListResponse & { facets: NonNullable<ProductListResponse["facets"]> }> {
  const data = await get<ProductListResponse>("products", productSearch(query));
  if (!data) return EMPTY_LIST;
  return {
    ...EMPTY_LIST,
    ...data,
    facets: data.facets ?? EMPTY_LIST.facets,
    results: data.results ?? [],
  };
}

/**
 * Карточка товара по id или slug. Чужой черновик бэкенд отдаёт как 404 —
 * страница по `null` вызовет notFound().
 */
export function getProduct(idOrSlug: string | number): Promise<Product | null> {
  return get<Product>(`products/${idOrSlug}`);
}

/** Похожие товары: та же категория, затем товары того же магазина. */
export async function relatedProducts(
  product: Product,
  limit = 10,
): Promise<Product[]> {
  const pools = await Promise.all([
    product.category
      ? listProducts({ category: product.category.slug, page_size: limit + 1 })
      : Promise.resolve(EMPTY_LIST),
    product.seller
      ? listProducts({ seller: product.seller.slug, page_size: limit + 1 })
      : Promise.resolve(EMPTY_LIST),
  ]);

  const seen = new Set<number>([product.id]);
  const out: Product[] = [];
  for (const pool of pools) {
    for (const item of pool.results) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Справочники                                                        */
/* ------------------------------------------------------------------ */

type Envelope<T> = { count: number; results: T[] };

export async function listCategories(): Promise<
  Array<Category & { product_count: number }>
> {
  const data = await get<Envelope<Category & { product_count: number }>>(
    "categories",
  );
  return data?.results ?? [];
}

export async function getCategory(
  key: string | number,
): Promise<(Category & { product_count: number }) | null> {
  if (key === "" || key === undefined || key === null) return null;
  const needle = String(key);
  const categories = await listCategories();
  return (
    categories.find((c) => c.slug === needle || String(c.id) === needle) ?? null
  );
}

export type SellerCard = Seller;

export async function listSellers(): Promise<SellerCard[]> {
  const data = await get<Envelope<SellerCard>>("sellers");
  return data?.results ?? [];
}

/** Магазин + его активные товары (публичная витрина). */
export function getSeller(
  key: string | number,
): Promise<(SellerCard & { products: Product[] }) | null> {
  return get<SellerCard & { products: Product[] }>(`sellers/${key}`);
}

/* ------------------------------------------------------------------ */
/*  Отзывы                                                             */
/* ------------------------------------------------------------------ */

export interface ReviewsPayload {
  summary: ReviewSummary;
  results: Review[];
  can_review: boolean;
  purchases: number;
}

const EMPTY_REVIEWS: ReviewsPayload = {
  summary: {
    count: 0,
    average: 0,
    breakdown: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })),
  },
  results: [],
  can_review: false,
  purchases: 0,
};

export async function listReviews(
  productId: number | string,
): Promise<ReviewsPayload> {
  const data = await get<ReviewsPayload>(`products/${productId}/reviews`);
  return data ? { ...EMPTY_REVIEWS, ...data } : EMPTY_REVIEWS;
}

/* ------------------------------------------------------------------ */
/*  Заказы покупателя                                                  */
/* ------------------------------------------------------------------ */

export async function listOrders(): Promise<ShopOrder[]> {
  const data = await get<Envelope<ShopOrder>>("orders");
  return data?.results ?? [];
}

/** Заказ виден покупателю и продавцу позиции; иначе бэкенд отвечает 404. */
export function getOrder(id: string | number): Promise<ShopOrder | null> {
  return get<ShopOrder>(`orders/${id}`);
}

/* ------------------------------------------------------------------ */
/*  Кабинет продавца                                                   */
/* ------------------------------------------------------------------ */

/**
 * Магазин текущего пользователя.
 * Важно: у аккаунта без магазина это **200 с телом `null`**, а не 404.
 */
export function getMyShop(): Promise<Seller | null> {
  return get<Seller>("shop");
}

/** Свои товары, включая черновики и архив. */
export async function listMyProducts(): Promise<Product[]> {
  const data = await get<Envelope<Product>>("products/mine");
  return data?.results ?? [];
}

export interface ShopOrdersPayload {
  count: number;
  results: ShopOrder[];
  stats: SellerStats | null;
}

/** Заказы магазина: только позиции этого продавца + агрегаты. */
export async function listShopOrders(): Promise<ShopOrdersPayload> {
  const data = await get<ShopOrdersPayload>("shop/orders");
  return {
    count: data?.count ?? 0,
    results: data?.results ?? [],
    stats: data?.stats ?? null,
  };
}

/* ------------------------------------------------------------------ */
/*  Производные данные (бэкенд не отдаёт их отдельным эндпоинтом)      */
/* ------------------------------------------------------------------ */

export interface MarketplaceStats {
  products: number;
  categories: number;
  sellers: number;
  reviews: number;
}

/** Публичные счётчики для главной и лендинга «Продавать на Uzum». */
export async function marketplaceStats(): Promise<MarketplaceStats> {
  const [categories, sellers] = await Promise.all([
    listCategories(),
    listSellers(),
  ]);
  return {
    products: categories.reduce((acc, c) => acc + (c.product_count ?? 0), 0),
    categories: categories.length,
    sellers: sellers.length,
    reviews: sellers.reduce((acc, s) => acc + (s.reviews_count ?? 0), 0),
  };
}

export type ReviewRow = Review & {
  product: { id: number; title: string; image: string };
};

/**
 * Отзывы о товарах магазина — для кабинета продавца.
 * Отдельного эндпоинта нет, поэтому собираем из своих товаров: список
 * небольшой (десятки позиций), запросы идут параллельно.
 */
export async function sellerReviews(): Promise<ReviewRow[]> {
  const products = await listMyProducts();
  const active = products.filter((p) => p.status === "active");
  const perProduct = await Promise.all(
    active.map(async (product) => {
      const { results } = await listReviews(product.id);
      return results.map((review) => ({
        ...review,
        product: {
          id: product.id,
          title: product.title,
          image: product.image,
        },
      }));
    }),
  );
  return perProduct
    .flat()
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

/**
 * Мои отзывы (личный кабинет покупателя). Бэкенд помечает свой отзыв
 * флагом `own`, поэтому фильтруем по нему среди купленных товаров.
 */
export async function myReviews(): Promise<ReviewRow[]> {
  const orders = await listOrders();
  const products = new Map<number, { title: string; image: string }>();
  for (const order of orders) {
    for (const item of order.items) {
      if (!products.has(item.product_id)) {
        products.set(item.product_id, { title: item.title, image: item.image });
      }
    }
  }

  const perProduct = await Promise.all(
    Array.from(products.entries()).map(async ([productId, meta]) => {
      const { results } = await listReviews(productId);
      return results
        .filter((review) => review.own)
        .map((review) => ({
          ...review,
          product: { id: productId, title: meta.title, image: meta.image },
        }));
    }),
  );

  return perProduct
    .flat()
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}
