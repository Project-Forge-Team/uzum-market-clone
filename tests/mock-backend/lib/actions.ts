/**
 * Все записи в локальную БД живут здесь: товар, отзыв, заказ, магазин,
 * профиль, загрузка файлов. Валидация — своя, короткая и читаемая
 * (учебный проект важнее, чем 40 схем в zod).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  getDb,
  hashPassword,
  nextId,
  nowIso,
  resetDb,
  saveDb,
  slugify,
  uniqueSellerSlug,
  verifyPassword,
  type ProductRow,
  type ProductStatus,
  type OrderRow,
  type OrderStatus,
  type ReviewRow,
} from "./db.ts";
import { ApiError, toNumber } from "./http.ts";
import { canBuyerReview } from "./catalog.ts";

/* ------------------------------------------------------------------ */
/*  Валидаторы                                                         */
/* ------------------------------------------------------------------ */
const clampText = (value: unknown, max: number) =>
  String(value ?? "").trim().slice(0, max);

function requireLength(
  value: string,
  field: string,
  min: number,
  max: number,
): string {
  if (value.length < min) {
    throw new ApiError(400, `«${field}» слишком короткое: минимум ${min} символов`);
  }
  if (value.length > max) {
    throw new ApiError(400, `«${field}» слишком длинное: максимум ${max} символов`);
  }
  return value;
}

const ALLOWED_STATUSES: ProductStatus[] = ["active", "draft", "archived"];

function normalizeImageList(input: unknown, fallback: string): string[] {
  const list = Array.isArray(input)
    ? input.map((v) => clampText(v, 400))
    : typeof input === "string"
      ? [clampText(input, 400)]
      : [];
  const safe = list.filter(
    (url) =>
      url.startsWith("/products/") ||
      url.startsWith("/api/uploads/") ||
      url.startsWith("/uploads/") ||
      /^https?:\/\//i.test(url),
  );
  return Array.from(new Set(safe)).slice(0, 8).length
    ? Array.from(new Set(safe)).slice(0, 8)
    : [fallback];
}

function normalizeCharacteristics(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const k = clampText(key, 40);
    const v = clampText(value, 120);
    if (!k || !v) continue;
    out[k] = v;
    if (Object.keys(out).length >= 24) break;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Товары продавца                                                    */
/* ------------------------------------------------------------------ */
export interface ProductInput {
  title?: string;
  description?: string;
  price?: number | string;
  old_price?: number | string | null;
  stock?: number | string;
  category_id?: number | string;
  /** Допустимо прислать и slug категории — удобно для «сырых» запросов. */
  category?: number | string;
  delivery_time?: string;
  images?: string[] | string;
  characteristics?: Record<string, string>;
  status?: ProductStatus;
  is_ad?: boolean;
  brand?: string;
}

/** Категорию ищем по id, а если прислали slug — по нему. */
function findCategory(input: ProductInput) {
  const db = getDb();
  const rawId = input.category_id ?? input.category;
  const byId = db.categories.find((c) => c.id === toNumber(rawId, 0));
  if (byId) return byId;
  const slug = String(input.category ?? "");
  return slug ? db.categories.find((c) => c.slug === slug) : undefined;
}

function uniqueProductSlug(db: ReturnType<typeof getDb>, title: string, ignoreId?: number) {
  const base = slugify(title) || `product-${Date.now().toString(36)}`;
  let candidate = base;
  let i = 2;
  while (
    db.products.some((p) => p.slug === candidate && p.id !== ignoreId)
  ) {
    candidate = `${base}-${i}`;
    i += 1;
  }
  return candidate;
}

function validateProductInput(input: ProductInput) {
  const title = requireLength(clampText(input.title, 120), "Название", 8, 120);
  const description = requireLength(
    clampText(input.description, 4000),
    "Описание",
    20,
    4000,
  );
  const price = Math.round(toNumber(input.price, -1));
  if (price <= 0 || price > 5_000_000_000) {
    throw new ApiError(400, "Цена должна быть положительным числом в сумах");
  }
  const rawOld =
    input.old_price === null || input.old_price === undefined || input.old_price === ""
      ? null
      : Math.round(toNumber(input.old_price, 0));
  const old_price = rawOld && rawOld > price ? rawOld : null;

  const stock = Math.max(0, Math.min(99_999, Math.round(toNumber(input.stock, 10))));
  const delivery_time = clampText(input.delivery_time, 40) || "Завтра";
  const brand = clampText(input.brand, 40) || "Без бренда";
  const status =
    input.status && ALLOWED_STATUSES.includes(input.status)
      ? input.status
      : "active";

  return { title, description, price, old_price, stock, delivery_time, brand, status };
}

export function createProduct(ownerId: number, input: ProductInput) {
  const db = getDb();
  const seller = db.sellers.find((s) => s.owner_id === ownerId);
  if (!seller) {
    throw new ApiError(403, "У вашего аккаунта ещё нет магазина. Заполните данные магазина в кабинете.");
  }
  const category = findCategory(input);
  if (!category) throw new ApiError(400, "Выберите категорию товара");

  const v = validateProductInput(input);
  const placeholder = "/products/placeholder.svg";
  const row: ProductRow = {
    id: nextId(db, "products"),
    slug: uniqueProductSlug(db, v.title),
    title: v.title,
    description: v.description,
    price: v.price,
    old_price: v.old_price,
    stock: v.stock,
    brand: v.brand,
    delivery_time: v.delivery_time,
    characteristics: normalizeCharacteristics(input.characteristics),
    image: "",
    images: [],
    category_id: category.id,
    seller_id: seller.id,
    is_ad: !!input.is_ad,
    status: v.status,
    views: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  row.images = normalizeImageList(input.images, placeholder);
  row.image = row.images[0];

  db.products.push(row);
  saveDb(db);
  return row.id;
}

export function updateProduct(ownerId: number, productId: number, input: ProductInput) {
  const db = getDb();
  const row = db.products.find((p) => p.id === productId);
  const seller = db.sellers.find((s) => s.owner_id === ownerId);
  if (!row) throw new ApiError(404, "Товар не найден");
  if (!seller || row.seller_id !== seller.id) {
    throw new ApiError(403, "Можно менять только свои товары");
  }

  // PATCH может прийти «кусочком» (например, только остаток), поэтому
  // валидируем и сохраняем слитые значения: присланные поля поверх текущих.
  const merged: ProductInput = {
    title: input.title ?? row.title,
    description: input.description ?? row.description,
    price: input.price ?? row.price,
    old_price: input.old_price === undefined ? row.old_price : input.old_price,
    stock: input.stock ?? row.stock,
    delivery_time: input.delivery_time ?? row.delivery_time,
    brand: input.brand ?? row.brand,
    status: input.status ?? row.status,
    is_ad: input.is_ad === undefined ? row.is_ad : !!input.is_ad,
    images: input.images === undefined ? row.images : input.images,
    characteristics:
      input.characteristics === undefined ? row.characteristics : input.characteristics,
    category_id:
      input.category_id ?? (input.category !== undefined ? input.category : row.category_id),
  };

  const v = validateProductInput(merged);
  const category = findCategory(merged);
  if (!category) throw new ApiError(400, "Категория не найдена");

  Object.assign(row, {
    title: v.title,
    description: v.description,
    price: v.price,
    old_price: v.old_price,
    stock: v.stock,
    delivery_time: v.delivery_time,
    brand: v.brand,
    status: v.status,
    is_ad: !!merged.is_ad,
    category_id: category.id,
    characteristics: normalizeCharacteristics(merged.characteristics),
    updated_at: nowIso(),
  });
  row.images = normalizeImageList(merged.images, row.images[0] ?? "/products/placeholder.svg");
  row.image = row.images[0];
  row.slug = uniqueProductSlug(db, v.title, row.id);

  saveDb(db);
  return row.id;
}

export function setProductStatus(
  ownerId: number,
  productId: number,
  status: ProductStatus,
) {
  const db = getDb();
  const row = db.products.find((p) => p.id === productId);
  const seller = db.sellers.find((s) => s.owner_id === ownerId);
  if (!row) throw new ApiError(404, "Товар не найден");
  if (!seller || row.seller_id !== seller.id) {
    throw new ApiError(403, "Можно менять только свои товары");
  }
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new ApiError(400, "Неизвестный статус товара");
  }
  row.status = status;
  row.updated_at = nowIso();
  saveDb(db);
  return row.id;
}

export function deleteProduct(ownerId: number, productId: number) {
  const db = getDb();
  const row = db.products.find((p) => p.id === productId);
  const seller = db.sellers.find((s) => s.owner_id === ownerId);
  if (!row) throw new ApiError(404, "Товар не найден");
  if (!seller || row.seller_id !== seller.id) {
    throw new ApiError(403, "Можно удалять только свои товары");
  }
  db.products = db.products.filter((p) => p.id !== productId);
  db.reviews = db.reviews.filter((r) => r.product_id !== productId);
  saveDb(db);
  return true;
}

export function addView(productId: number) {
  const db = getDb();
  const row = db.products.find((p) => p.id === productId);
  if (!row) return;
  row.views += 1;
  saveDb(db);
}

/* ------------------------------------------------------------------ */
/*  Отзывы                                                             */
/* ------------------------------------------------------------------ */
export interface ReviewInput {
  rating?: number | string;
  text?: string;
  pros?: string;
  cons?: string;
}

const userBought = canBuyerReview;

/** Один отзыв на товар: повторная отправка обновляет существующий. */
export function upsertReview(
  userId: number,
  productId: number,
  input: ReviewInput,
) {
  const db = getDb();
  const product = db.products.find((p) => p.id === productId && p.status === "active");
  if (!product) throw new ApiError(404, "Товар не найден");

  const rating = Math.round(toNumber(input.rating, 0));
  if (rating < 1 || rating > 5) {
    throw new ApiError(400, "Поставьте оценку от 1 до 5 звёзд");
  }
  const text = requireLength(clampText(input.text, 2000), "Текст отзыва", 15, 2000);
  const pros = clampText(input.pros, 200);
  const cons = clampText(input.cons, 200);

  const user = db.users.find((u) => u.id === userId);
  const author =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.email?.split("@")[0] ||
    "Покупатель";

  const existing = db.reviews.find(
    (r) => r.product_id === productId && r.user_id === userId,
  );
  const verified = userBought(db, userId, productId);
  if (!existing && !verified) {
    throw new ApiError(
      403,
      "Отзыв могут оставить только покупатели, которые уже купили этот товар. Оформите заказ — форма откроется, как только продавец подтвердит покупку.",
    );
  }

  if (existing) {
    existing.rating = rating;
    existing.text = text;
    existing.pros = pros;
    existing.cons = cons;
    existing.author = author;
    existing.verified = verified || existing.verified;
    existing.created_at = nowIso();
    saveDb(db);
    return { id: existing.id, updated: true };
  }

  const row: ReviewRow = {
    id: nextId(db, "reviews"),
    product_id: productId,
    user_id: userId,
    author,
    rating,
    text,
    pros,
    cons,
    created_at: nowIso(),
    verified,
    seller_reply: null,
  };
  db.reviews.push(row);
  saveDb(db);
  return { id: row.id, updated: false };
}

export function deleteReview(userId: number, reviewId: number) {
  const db = getDb();
  const review = db.reviews.find((r) => r.id === reviewId);
  if (!review) throw new ApiError(404, "Отзыв не найден");

  const seller = db.sellers.find((s) => s.owner_id === userId);
  const product = db.products.find((p) => p.id === review.product_id);
  const isOwner = review.user_id === userId;
  const isSeller = !!(seller && product && product.seller_id === seller.id);
  if (!isOwner && !isSeller) {
    throw new ApiError(403, "Удалить отзыв может только его автор или продавец товара");
  }
  db.reviews = db.reviews.filter((r) => r.id !== reviewId);
  saveDb(db);
  return true;
}

export function replyToReview(
  ownerId: number,
  reviewId: number,
  reply: string,
) {
  const db = getDb();
  const review = db.reviews.find((r) => r.id === reviewId);
  if (!review) throw new ApiError(404, "Отзыв не найден");
  const product = db.products.find((p) => p.id === review.product_id);
  const seller = db.sellers.find((s) => s.owner_id === ownerId);
  if (!seller || !product || product.seller_id !== seller.id) {
    throw new ApiError(403, "Отвечать на отзывы можно только о своих товарах");
  }
  const text = requireLength(clampText(reply, 800), "Ответ", 5, 800);
  review.seller_reply = text;
  saveDb(db);
  return review.id;
}

/* ------------------------------------------------------------------ */
/*  Заказы                                                             */
/* ------------------------------------------------------------------ */
export interface CheckoutInput {
  items?: Array<{ product_id?: number | string; qty?: number | string }>;
  address?: string;
  pickup_point?: string;
  delivery_method?: string;
  payment_method?: string;
  comment?: string;
  promo_code?: string;
}

const PROMO_CODES: Record<string, { percent: number; min: number; label: string }> = {
  STUDENT10: { percent: 10, min: 200_000, label: "Учебный промокод: −10%" },
  UZUM2026: { percent: 5, min: 0, label: "Знакомство с маркетплейсом: −5%" },
};

export const FREE_DELIVERY_FROM = 500_000;
export const COURIER_COST = 25_000;

export function calcOrderTotals(
  subtotal: number,
  deliveryMethod: "courier" | "pickup",
  promoCode?: string,
) {
  const promo = promoCode ? PROMO_CODES[promoCode.toUpperCase()] : undefined;
  const discount =
    promo && subtotal >= promo.min
      ? Math.round((subtotal * promo.percent) / 100)
      : 0;
  const deliveryCost =
    deliveryMethod === "pickup" || subtotal - discount >= FREE_DELIVERY_FROM
      ? 0
      : COURIER_COST;
  return {
    discount,
    delivery_cost: deliveryCost,
    total: Math.max(0, subtotal - discount + deliveryCost),
    promo_valid: !promoCode || !!promo,
    promo_label: promo?.label ?? null,
  };
}

export function createOrder(userId: number, input: CheckoutInput) {
  const db = getDb();
  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (!rawItems.length) throw new ApiError(400, "Корзина пуста — добавьте товары");
  if (rawItems.length > 30) throw new ApiError(400, "Слишком много позиций в заказе");

  const items = rawItems.map((line) => {
    const productId = toNumber(line.product_id, 0);
    const qty = Math.round(toNumber(line.qty, 0));
    const product = db.products.find((p) => p.id === productId);
    if (!product) throw new ApiError(400, `Товар #${productId} больше не существует`);
    if (product.status !== "active") {
      throw new ApiError(400, `«${product.title}» снят с продажи`);
    }
    if (qty < 1 || qty > 20) {
      throw new ApiError(400, "Количество в заказе — от 1 до 20 штук");
    }
    if (product.stock < qty) {
      throw new ApiError(
        400,
        `«${product.title}»: на складе всего ${product.stock} шт.`,
      );
    }
    return {
      product_id: product.id,
      title: product.title,
      image: product.image,
      price: product.price,
      qty,
      seller_id: product.seller_id,
      seller_name:
        db.sellers.find((s) => s.id === product.seller_id)?.name ?? "Магазин",
    };
  });

  const address = requireLength(clampText(input.address, 200), "Адрес", 8, 200);
  const deliveryMethod =
    input.delivery_method === "pickup" ? "pickup" : "courier";
  const paymentMethod: OrderRow["payment_method"] =
    input.payment_method === "cash" || input.payment_method === "installment"
      ? input.payment_method
      : "card";
  const pickupPoint =
    deliveryMethod === "pickup"
      ? clampText(input.pickup_point, 80) || "UZ-001 · ул. Амира Темура, 15"
      : "";

  // Схлопываем дубликаты позиций по товару.
  const merged = new Map<number, (typeof items)[number]>();
  for (const item of items) {
    const prev = merged.get(item.product_id);
    if (prev) prev.qty += item.qty;
    else merged.set(item.product_id, { ...item });
  }
  for (const item of merged.values()) {
    const product = db.products.find((p) => p.id === item.product_id)!;
    if (product.stock < item.qty) {
      throw new ApiError(
        400,
        `«${product.title}»: в наличии только ${product.stock} шт.`,
      );
    }
  }

  const subtotal = Array.from(merged.values()).reduce(
    (acc, i) => acc + i.price * i.qty,
    0,
  );
  const promoCode = clampText(input.promo_code, 24).toUpperCase();
  const totals = calcOrderTotals(subtotal, deliveryMethod, promoCode);
  if (promoCode && !totals.promo_valid) {
    throw new ApiError(400, `Промокод «${promoCode}» не существует`);
  }

  const order: OrderRow = {
    id: nextId(db, "orders"),
    number: `UZ-${100_000 + Math.floor(Math.random() * 899_999)}`,
    user_id: userId,
    items: Array.from(merged.values()),
    status: "new",
    subtotal,
    discount: totals.discount,
    promo_code: totals.promo_label ? promoCode : null,
    delivery_cost: totals.delivery_cost,
    total: totals.total,
    address,
    pickup_point: pickupPoint,
    delivery_method: deliveryMethod,
    payment_method: paymentMethod,
    comment: clampText(input.comment, 300),
    created_at: nowIso(),
  };

  // Списываем остатки — как настоящий маркетплейс.
  for (const item of order.items) {
    const product = db.products.find((p) => p.id === item.product_id)!;
    product.stock = Math.max(0, product.stock - item.qty);
  }

  db.orders.push(order);
  db.orderEvents.push({
    order_id: order.id,
    status: "new",
    at: order.created_at,
    note: "Заказ собран и передан продавцу",
  });
  saveDb(db);
  return order.id;
}

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  new: "packing",
  packing: "shipping",
  shipping: "delivered",
  delivered: null,
  cancelled: null,
};

const STATUS_NOTES: Record<OrderStatus, string> = {
  new: "Заказ принят магазином",
  packing: "Товар упакован на складе",
  shipping: "Курьер выехал по адресу",
  delivered: "Заказ доставлен и получен",
  cancelled: "Заказ отменён",
};

export function advanceOrder(
  actorId: number,
  orderId: number,
  action: "advance" | "cancel",
) {
  const db = getDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) throw new ApiError(404, "Заказ не найден");

  const seller = db.sellers.find((s) => s.owner_id === actorId);
  const isSeller = !!(
    seller &&
    order.items.some((i) => i.seller_id === seller.id)
  );
  const isBuyer = order.user_id === actorId;
  if (!isSeller && !isBuyer) {
    throw new ApiError(403, "Этот заказ вам не принадлежит");
  }

  if (action === "cancel") {
    if (!isBuyer) throw new ApiError(403, "Отменить заказ может только покупатель");
    if (order.status === "delivered" || order.status === "cancelled") {
      throw new ApiError(400, "Этот заказ уже нельзя отменить");
    }
    order.status = "cancelled";
    for (const item of order.items) {
      const product = db.products.find((p) => p.id === item.product_id);
      if (product) product.stock += item.qty;
    }
  } else {
    if (!isSeller && !isBuyer) throw new ApiError(403, "Недостаточно прав");
    const next = NEXT_STATUS[order.status];
    if (!next) throw new ApiError(400, "Статус дальше менять некуда");
    order.status = next;
  }

  db.orderEvents.push({
    order_id: order.id,
    status: order.status,
    at: nowIso(),
    note: STATUS_NOTES[order.status],
  });
  saveDb(db);
  return order.status;
}

/* ------------------------------------------------------------------ */
/*  Магазин, профиль, файлы                                            */
/* ------------------------------------------------------------------ */
export function updateShop(
  ownerId: number,
  input: { name?: string; description?: string; city?: string },
) {
  const db = getDb();
  const seller = db.sellers.find((s) => s.owner_id === ownerId);
  if (!seller) throw new ApiError(404, "Магазин не найден");

  if (input.name !== undefined) {
    const name = requireLength(clampText(input.name, 60), "Название магазина", 3, 60);
    // Слаг остаётся прежним: переименование не должно ломать ссылку /shop/<slug>,
    // которую продавец уже мог куда-то поставить. Дубли названий допустимы.
    seller.name = name;
  }
  if (input.description !== undefined) {
    seller.description = clampText(input.description, 600);
  }
  if (input.city !== undefined) {
    seller.city = clampText(input.city, 40) || "Ташкент";
  }
  saveDb(db);
  return seller.id;
}

export function ensureShopForUser(ownerId: number, name: string) {
  const db = getDb();
  const user = db.users.find((u) => u.id === ownerId);
  if (!user) throw new ApiError(404, "Пользователь не найден");
  if (user.seller_id) return user.seller_id;

  const shopName = requireLength(clampText(name, 60), "Название магазина", 3, 60);
  const seller = {
    id: nextId(db, "sellers"),
    name: shopName,
    slug: uniqueSellerSlug(shopName, (slug) => db.sellers.some((s) => s.slug === slug)),
    city: "Ташкент",
    description: "Небольшой магазин на учебном маркетплейсе.",
    owner_id: ownerId,
    created_at: nowIso(),
    verified: false,
  };
  db.sellers.push(seller);
  user.seller_id = seller.id;
  saveDb(db);
  return seller.id;
}

export function changePassword(userId: number, current: string, next: string) {
  const db = getDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new ApiError(404, "Пользователь не найден");
  if (!verifyPassword(current ?? "", user)) {
    throw new ApiError(400, "Текущий пароль указан неверно");
  }
  if ((next ?? "").length < 8) {
    throw new ApiError(400, "Новый пароль должен быть не короче 8 символов");
  }
  const { salt, hash } = hashPassword(next);
  user.passwordHash = hash;
  user.salt = salt;
  saveDb(db);
  return true;
}

/* ---------- Загрузка картинок ---------- */
const UPLOAD_DIR = process.env.UZUM_DB_DIR
  ? path.join(path.resolve(process.env.UZUM_DB_DIR), "uploads")
  : path.join(process.cwd(), ".data", "uploads");

const IMAGE_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function saveUpload(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) {
    throw new ApiError(400, "Картинка больше 2 МБ — сожмите её");
  }
  const ext = IMAGE_TYPES[file.type];
  if (!ext) {
    throw new ApiError(400, "Можно загрузить PNG, JPG, WEBP или GIF");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
  return `/api/uploads/${name}`;
}

export function readUpload(name: string): { body: Buffer; type: string } | null {
  const safe = path.basename(name);
  if (safe !== name) return null;
  const full = path.join(UPLOAD_DIR, safe);
  if (!fs.existsSync(full)) return null;
  const ext = path.extname(safe).toLowerCase();
  const type =
    Object.entries(IMAGE_TYPES).find(([, e]) => e === ext)?.[0] ??
    "application/octet-stream";
  return { body: fs.readFileSync(full), type };
}

export function resetDemoData() {
  return resetDb();
}
