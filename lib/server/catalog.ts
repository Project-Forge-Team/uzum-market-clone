/**
 * Чтение данных: списки, карточка товара, фильтры, поиск, отзывы, заказы.
 * Используется и Server Components (напрямую), и route handlers (через /api).
 */
import {
  getDb,
  type CategoryRow,
  type Database,
  type OrderRow,
  type ProductRow,
  type ReviewRow,
  type SellerRow,
} from "./db";
import type {
  Category,
  MonthlyPayment,
  Product,
  Review,
  ReviewSummary,
  Seller,
  SellerStats,
  ShopOrder,
} from "@/types/product";

export const PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/*  Мелкие утилиты                                                     */
/* ------------------------------------------------------------------ */
function round(n: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function discountPercent(price: number, oldPrice: number | null) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

/** «Рассрочка 0% на 12 месяцев» — как платёж в месяц. */
export function monthlyPayment(price: number): MonthlyPayment {
  return {
    months: 12,
    per_month: Math.ceil(price / 12 / 100) * 100,
    overpay: 0,
  };
}

function looksNumeric(value: string) {
  return /^\d+$/.test(value);
}

function resolveCategory(
  db: Database,
  key: string | number | null | undefined,
): CategoryRow | null {
  if (key === null || key === undefined || key === "") return null;
  const s = String(key);
  return (
    db.categories.find((c) =>
      looksNumeric(s) ? c.id === Number(s) : c.slug === s,
    ) ?? null
  );
}

function resolveSeller(
  db: Database,
  key: string | number | null | undefined,
): SellerRow | null {
  if (key === null || key === undefined || key === "") return null;
  const s = String(key);
  return (
    db.sellers.find((c) => (looksNumeric(s) ? c.id === Number(s) : c.slug === s)) ??
    null
  );
}

/* ------------------------------------------------------------------ */
/*  Сериализация строк в публичные DTO                                 */
/* ------------------------------------------------------------------ */
export function reviewsForProduct(db: Database, productId: number): ReviewRow[] {
  return db.reviews
    .filter((r) => r.product_id === productId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function reviewSummaryFor(
  db: Database,
  productId: number,
): ReviewSummary {
  const list = reviewsForProduct(db, productId);
  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: list.filter((r) => r.rating === stars).length,
  }));
  const average = list.length
    ? round(list.reduce((acc, r) => acc + r.rating, 0) / list.length, 2)
    : 0;
  return {
    count: list.length,
    average,
    breakdown,
  };
}

export function serializeSeller(
  db: Database,
  seller: SellerRow | null | undefined,
): Seller | null {
  if (!seller) return null;
  const products = db.products.filter(
    (p) => p.seller_id === seller.id && p.status === "active",
  );
  const productIds = new Set(products.map((p) => p.id));
  const sellerReviews = db.reviews.filter((r) => productIds.has(r.product_id));
  const rating = sellerReviews.length
    ? round(
        sellerReviews.reduce((acc, r) => acc + r.rating, 0) /
          sellerReviews.length,
        2,
      )
    : 0;

  return {
    id: seller.id,
    name: seller.name,
    slug: seller.slug,
    city: seller.city,
    description: seller.description,
    rating,
    reviews_count: sellerReviews.length,
    product_count: products.length,
    verified: seller.verified,
    owner_id: seller.owner_id,
  };
}

export function serializeCategory(
  db: Database,
  category: CategoryRow,
): Category & { product_count: number } {
  const product_count = db.products.filter(
    (p) => p.category_id === category.id && p.status === "active",
  ).length;
  return { ...category, product_count };
}

export function serializeProduct(
  db: Database,
  row: ProductRow,
  viewerId: number | null = null,
): Product {
  const category = db.categories.find((c) => c.id === row.category_id) ?? null;
  const seller = db.sellers.find((s) => s.id === row.seller_id) ?? null;
  const summary = reviewSummaryFor(db, row.id);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    price: row.price,
    old_price: row.old_price,
    discount_percent: discountPercent(row.price, row.old_price),
    monthly_payment: monthlyPayment(row.price),
    rating: summary.average,
    reviews_count: summary.count,
    delivery_time: row.delivery_time,
    stock: row.stock,
    in_stock: row.stock > 0,
    brand: row.brand,
    image: row.image,
    images: row.images.length ? row.images : [row.image],
    characteristics: row.characteristics ?? {},
    is_ad: row.is_ad,
    views: row.views,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    seller: seller ? serializeSeller(db, seller) : null,
    category: category
      ? { id: category.id, name: category.name, slug: category.slug, emoji: category.emoji }
      : null,
    rating_breakdown: summary.breakdown,
    has_own_review:
      viewerId !== null &&
      db.reviews.some((r) => r.product_id === row.id && r.user_id === viewerId),
  };
}

export function serializeReview(
  db: Database,
  row: ReviewRow,
  viewerId: number | null = null,
): Review {
  const authorUser = row.user_id
    ? db.users.find((u) => u.id === row.user_id)
    : undefined;
  const name =
    row.author ||
    [authorUser?.first_name, authorUser?.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Покупатель";
  return {
    id: row.id,
    product_id: row.product_id,
    author: name,
    initials: name.slice(0, 1).toUpperCase(),
    rating: row.rating,
    text: row.text,
    pros: row.pros ?? "",
    cons: row.cons ?? "",
    created_at: row.created_at,
    verified: row.verified,
    seller_reply: row.seller_reply,
    own: viewerId !== null && row.user_id === viewerId,
  };
}

/* ------------------------------------------------------------------ */
/*  Товары: список с фильтрами                                         */
/* ------------------------------------------------------------------ */
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
  status?: ProductRow["status"];
  viewerId?: number | null;
}

function matchSearch(row: ProductRow, db: Database, needle: string) {
  if (!needle) return true;
  const category = db.categories.find((c) => c.id === row.category_id)?.name ?? "";
  const seller = db.sellers.find((s) => s.id === row.seller_id)?.name ?? "";
  const haystack = [
    row.title,
    row.description,
    row.brand,
    row.slug,
    category,
    seller,
    Object.values(row.characteristics ?? {}).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return needle
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

function sortProducts(rows: ProductRow[], db: Database, ordering: string) {
  const ratingOf = (row: ProductRow) =>
    reviewSummaryFor(db, row.id).average;

  const sorted = [...rows];
  switch (ordering) {
    case "price":
      return sorted.sort((a, b) => a.price - b.price);
    case "-price":
      return sorted.sort((a, b) => b.price - a.price);
    case "rating":
    case "-rating":
      return sorted.sort(
        (a, b) =>
          ratingOf(b) - ratingOf(a) ||
          reviewSummaryFor(db, b.id).count - reviewSummaryFor(db, a.id).count,
      );
    case "new":
    case "-created_at":
      return sorted.sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
      );
    case "discount":
      return sorted.sort(
        (a, b) =>
          discountPercent(b.price, b.old_price) -
          discountPercent(a.price, a.old_price),
      );
    case "popular":
    case "-views":
      return sorted.sort((a, b) => b.views - a.views);
    default:
      // «рекомендуем»: скидка + рейтинг + просмотры
      return sorted.sort((a, b) => {
        const score = (p: ProductRow) =>
          discountPercent(p.price, p.old_price) * 0.6 +
          ratingOf(p) * 6 +
          Math.log10(1 + p.views) * 4;
        return score(b) - score(a);
      });
  }
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

/**
 * Основная «витрина»: фильтры + поиск + сортировка + пагинация.
 * facets.price считается по товарам, прошедшим все фильтры, кроме цены,
 * чтобы ползунок цены не «прыгал» при выборе диапазона.
 */
export function listProducts(query: ProductQuery = {}): ProductListResult {
  const db = getDb();
  const category = resolveCategory(db, query.category);
  const seller = resolveSeller(db, query.seller);
  const page = Math.max(1, Number(query.page) || 1);
  const wantedIds =
    typeof query.ids === "string"
      ? query.ids
          .split(",")
          .map((v) => Number(v.trim()))
          .filter((v) => Number.isFinite(v) && v > 0)
      : Array.isArray(query.ids)
        ? query.ids.filter((v) => Number.isFinite(v) && v > 0)
        : [];
  const idSet = wantedIds.length ? new Set(wantedIds) : null;
  const pageSize = Math.min(
    120,
    Math.max(
      4,
      Number(query.page_size) || (idSet ? wantedIds.length || PAGE_SIZE : PAGE_SIZE),
    ),
  );

  const base = db.products.filter((row) => {
    if (idSet) return idSet.has(row.id);
    if (query.status) return row.status === query.status;
    // Для витрины: только активные (свои черновики продавец видит отдельным запросом).
    return row.status === "active";
  });

  const passesCommon = (row: ProductRow) => {
    if (category && row.category_id !== category.id) return false;
    if (seller && row.seller_id !== seller.id) return false;
    if (query.in_stock && row.stock <= 0) return false;
    if (query.discounted) {
      if (discountPercent(row.price, row.old_price) <= 0) return false;
    }
    if (query.min_rating) {
      const { average, count } = reviewSummaryFor(db, row.id);
      if (count === 0 || average < Number(query.min_rating)) return false;
    }
    if (!matchSearch(row, db, (query.q ?? "").trim())) return false;
    return true;
  };

  const withoutPriceFilter = base.filter(passesCommon);
  const priceBounds = withoutPriceFilter.length
    ? {
        min: Math.min(...withoutPriceFilter.map((p) => p.price)),
        max: Math.max(...withoutPriceFilter.map((p) => p.price)),
      }
    : { min: 0, max: 0 };

  const filtered = withoutPriceFilter.filter((row) => {
    if (query.min_price !== undefined && row.price < Number(query.min_price))
      return false;
    if (query.max_price !== undefined && row.price > Number(query.max_price))
      return false;
    return true;
  });

  const ordered = idSet
    ? filtered
    : sortProducts(filtered, db, query.ordering ?? "");
  const start = (page - 1) * pageSize;
  const slice = ordered.slice(start, start + pageSize);

  const facetCategories = db.categories
    .map((c) => serializeCategory(db, c))
    .filter((c) => c.product_count > 0)
    .sort((a, b) => b.product_count - a.product_count);

  return {
    count: filtered.length,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    next: start + pageSize < filtered.length,
    previous: page > 1,
    results: slice.map((row) => serializeProduct(db, row, query.viewerId ?? null)),
    facets: { price: priceBounds, categories: facetCategories },
  };
}

export function getProductByIdOrSlug(
  idOrSlug: string | number,
  viewerId: number | null = null,
  options: { includeHidden?: boolean } = {},
): Product | null {
  const db = getDb();
  const s = String(idOrSlug);
  const row = db.products.find((p) =>
    looksNumeric(s) ? p.id === Number(s) : p.slug === s,
  );
  if (!row) return null;
  if (!options.includeHidden && row.status !== "active") {
    // Скрытый товар виден только владельцу магазина.
    const seller = db.sellers.find((x) => x.id === row.seller_id);
    if (!viewerId || seller?.owner_id !== viewerId) return null;
  }
  return serializeProduct(db, row, viewerId);
}

export function getRawProduct(id: number): ProductRow | null {
  return getDb().products.find((p) => p.id === id) ?? null;
}

export function relatedProducts(product: Product, limit = 10): Product[] {
  const db = getDb();
  return db.products
    .filter(
      (p) =>
        p.status === "active" &&
        p.id !== product.id &&
        (p.category_id === product.category?.id ||
          p.seller_id === product.seller?.id),
    )
    .sort((a, b) => {
      const sameCategory = (p: ProductRow) =>
        p.category_id === product.category?.id ? 1 : 0;
      return (
        sameCategory(b) - sameCategory(a) ||
        reviewSummaryFor(db, b.id).average - reviewSummaryFor(db, a.id).average
      );
    })
    .slice(0, limit)
    .map((p) => serializeProduct(db, p));
}

/* ------------------------------------------------------------------ */
/*  Категории и магазины                                               */
/* ------------------------------------------------------------------ */
export function listCategories() {
  const db = getDb();
  return db.categories.map((c) => serializeCategory(db, c));
}

export function getCategoryBySlugOrId(key: string | number) {
  const db = getDb();
  const row = resolveCategory(db, key);
  return row ? serializeCategory(db, row) : null;
}

export interface SellerCard extends Seller {
  product_count: number;
  order_count: number;
  created_at: string;
  city: string;
}

export function listSellers(): SellerCard[] {
  const db = getDb();
  return db.sellers
    .map((s) => {
      const base = serializeSeller(db, s)!;
      const products = db.products.filter(
        (p) => p.seller_id === s.id && p.status === "active",
      );
      const orders = db.orders.filter((o) =>
        o.items.some((i) => i.seller_id === s.id),
      );
      return {
        ...base,
        product_count: products.length,
        order_count: orders.length,
        created_at: s.created_at,
        city: s.city,
      };
    })
    .sort((a, b) => b.rating - a.rating || b.product_count - a.product_count);
}

export function getSellerBySlugOrId(key: string | number) {
  const db = getDb();
  const row = resolveSeller(db, key);
  if (!row) return null;
  return {
    ...serializeSeller(db, row)!,
    created_at: row.created_at,
    products: db.products
      .filter((p) => p.seller_id === row.id && p.status === "active")
      .map((p) => serializeProduct(db, p)),
  };
}

/* ------------------------------------------------------------------ */
/*  Отзывы                                                             */
/* ------------------------------------------------------------------ */
export function listReviews(
  productId: number,
  viewerId: number | null = null,
): { summary: ReviewSummary; results: Review[] } {
  const db = getDb();
  return {
    summary: reviewSummaryFor(db, productId),
    results: reviewsForProduct(db, productId).map((r) =>
      serializeReview(db, r, viewerId),
    ),
  };
}

export function myReviews(userId: number): Array<Review & { product: Product }> {
  const db = getDb();
  return db.reviews
    .filter((r) => r.user_id === userId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((r) => {
      const product = db.products.find((p) => p.id === r.product_id);
      return {
        ...serializeReview(db, r, userId),
        product: product ? serializeProduct(db, product, userId) : (null as never),
      };
    })
    .filter((r) => r.product);
}

/* ------------------------------------------------------------------ */
/*  Кабинет продавца                                                   */
/* ------------------------------------------------------------------ */
export function sellerProducts(sellerId: number): Product[] {
  const db = getDb();
  return db.products
    .filter((p) => p.seller_id === sellerId)
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .map((p) => serializeProduct(db, p));
}

export function sellerOrders(sellerId: number): ShopOrder[] {
  const db = getDb();
  return db.orders
    .filter((order) => order.items.some((i) => i.seller_id === sellerId))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((order) => {
      const items = order.items.filter((i) => i.seller_id === sellerId);
      const buyer = db.users.find((u) => u.id === order.user_id);
      const sellerSubtotal = items.reduce((acc, i) => acc + i.price * i.qty, 0);
      return {
        id: order.id,
        number: order.number,
        status: order.status,
        created_at: order.created_at,
        items,
        total: sellerSubtotal,
        subtotal: sellerSubtotal,
        // Промокод в демо оплатила «платформа», долю продавца не уменьшаем.
        discount: 0,
        promo_code: null,
        delivery_cost: order.delivery_cost,
        address: order.address,
        pickup_point: order.pickup_point,
        delivery_method: order.delivery_method,
        payment_method: order.payment_method,
        comment: order.comment,
        timeline: db.orderEvents
          .filter((e) => e.order_id === order.id)
          .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
          .map((e) => ({ status: e.status, at: e.at, note: e.note })),
        items_count: items.reduce((acc, i) => acc + i.qty, 0),
        buyer_name:
          [buyer?.first_name, buyer?.last_name].filter(Boolean).join(" ") ||
          buyer?.email ||
          "Покупатель",
      };
    });
}

export function sellerStats(sellerId: number): SellerStats {
  const db = getDb();
  const products = db.products.filter((p) => p.seller_id === sellerId);
  const active = products.filter((p) => p.status === "active");
  const productIds = new Set(products.map((p) => p.id));
  const reviews = db.reviews.filter((r) => productIds.has(r.product_id));
  const orders = db.orders.filter((o) =>
    o.items.some((i) => i.seller_id === sellerId),
  );
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce(
      (acc, o) =>
        acc +
        o.items
          .filter((i) => i.seller_id === sellerId)
          .reduce((sum, i) => sum + i.price * i.qty, 0),
      0,
    );

  return {
    product_count: active.length,
    draft_count: products.filter((p) => p.status !== "active").length,
    review_count: reviews.length,
    rating: reviews.length
      ? round(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length, 2)
      : 0,
    views: products.reduce((acc, p) => acc + p.views, 0),
    order_count: orders.length,
    revenue,
    stock_units: products.reduce((acc, p) => acc + p.stock, 0),
  };
}

/* ------------------------------------------------------------------ */
/*  Заказы                                                             */
/* ------------------------------------------------------------------ */
export function listOrders(userId: number): ShopOrder[] {
  const db = getDb();
  return db.orders
    .filter((o) => o.user_id === userId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((order) => serializeOrder(db, order));
}

export function getOrderForUser(orderId: number, userId: number) {
  const db = getDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return null;
  const user = db.users.find((u) => u.id === userId);
  const sellerOwned =
    user?.seller_id != null &&
    order.items.some((i) => i.seller_id === user.seller_id);
  if (order.user_id !== userId && !sellerOwned) return null;
  return serializeOrder(db, order, order.user_id !== userId);
}

export function serializeOrder(
  db: Database,
  order: OrderRow,
  hideBuyer = false,
): ShopOrder {
  const events = db.orderEvents
    .filter((e) => e.order_id === order.id)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    created_at: order.created_at,
    subtotal: order.subtotal,
    discount: order.discount,
    promo_code: order.promo_code,
    delivery_cost: order.delivery_cost,
    total: order.total,
    address: order.address,
    pickup_point: order.pickup_point,
    delivery_method: order.delivery_method,
    payment_method: order.payment_method,
    comment: order.comment,
    items: order.items,
    items_count: order.items.reduce((acc, i) => acc + i.qty, 0),
    buyer_name: hideBuyer
      ? undefined
      : (() => {
          const buyer = db.users.find((u) => u.id === order.user_id);
          return (
            [buyer?.first_name, buyer?.last_name].filter(Boolean).join(" ") ||
            buyer?.email ||
            ""
          );
        })(),
    timeline: events.map((e) => ({
      status: e.status,
      at: e.at,
      note: e.note,
    })),
  };
}

export function listAllOrdersForSeller(sellerId: number) {
  return sellerOrders(sellerId);
}

/** Публичная статистика для лендинга «Стать продавцом» и подвала. */
export function marketplaceStats() {
  const db = getDb();
  return {
    products: db.products.filter((p) => p.status === "active").length,
    categories: db.categories.length,
    sellers: db.sellers.length,
    reviews: db.reviews.length,
  };
}

/** Отзывы ко всем товарам магазина — нужны для ответов в кабинете продавца. */
export function sellerReviews(sellerId: number): Array<
  Review & { product: { id: number; title: string; image: string } }
> {
  const db = getDb();
  const products = db.products.filter((p) => p.seller_id === sellerId);
  const byId = new Map(products.map((p) => [p.id, p]));
  return db.reviews
    .filter((r) => byId.has(r.product_id))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((r) => {
      const product = byId.get(r.product_id)!;
      return {
        ...serializeReview(db, r),
        product: { id: product.id, title: product.title, image: product.image },
      };
    });
}
