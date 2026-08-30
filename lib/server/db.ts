/**
 * Локальное «хранилище» учебного клона Uzum Market.
 *
 * Это замена внешнему бэкенду: обычный Node-файл с JSON-документом
 * (`.data/db.json`), который читается/пишется приложением. Так проект
 * полностью автономный: каталог, регистрация, товары продавца, отзывы и
 * заказы работают без интернета и без отдельного сервера.
 *
 * Как почитать код:
 *   db.ts        — типы + движок (чтение/запись/сид)
 *   auth.ts      — пароли (scrypt) и сессии (HttpOnly cookie)
 *   catalog.ts   — чтение: товары, категории, магазины, отзывы
 *   actions.ts   — запись: товар, отзыв, заказ, профиль, магазин
 *   http.ts      — мелкие хелперы для route handlers
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import catalogFixture from "./catalog.json";

/* ------------------------------------------------------------------ */
/*  Типы данных                                                        */
/* ------------------------------------------------------------------ */
export type ProductStatus = "active" | "draft" | "archived";

export interface UserRow {
  id: number;
  email: string;
  passwordHash: string;
  salt: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_joined: string;
  seller_id: number | null;
}

export interface SellerRow {
  id: number;
  name: string;
  slug: string;
  city: string;
  description: string;
  owner_id: number | null;
  created_at: string;
  verified: boolean;
}

export interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  emoji: string;
  color: string;
}

export interface ProductRow {
  id: number;
  slug: string;
  title: string;
  description: string;
  price: number;
  old_price: number | null;
  stock: number;
  brand: string;
  delivery_time: string;
  characteristics: Record<string, string>;
  image: string;
  images: string[];
  category_id: number;
  seller_id: number;
  is_ad: boolean;
  status: ProductStatus;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewRow {
  id: number;
  product_id: number;
  user_id: number | null;
  author: string;
  rating: number;
  text: string;
  pros?: string;
  cons?: string;
  created_at: string;
  verified: boolean;
  seller_reply: string | null;
}

export type OrderStatus =
  | "new"
  | "packing"
  | "shipping"
  | "delivered"
  | "cancelled";

export interface OrderItemRow {
  product_id: number;
  title: string;
  image: string;
  price: number;
  qty: number;
  seller_id: number;
  seller_name: string;
}

export interface OrderRow {
  id: number;
  number: string;
  user_id: number;
  items: OrderItemRow[];
  status: OrderStatus;
  subtotal: number;
  discount: number;
  promo_code: string | null;
  delivery_cost: number;
  total: number;
  address: string;
  pickup_point: string;
  delivery_method: "courier" | "pickup";
  payment_method: "card" | "cash" | "installment";
  comment: string;
  created_at: string;
}

export interface SessionRow {
  token: string;
  user_id: number;
  created_at: string;
  expires_at: string;
}

/** Порядок статусов заказа — используется и сидом, и API-продвижением. */
export const ORDER_FLOW: OrderStatus[] = ["new", "packing", "shipping", "delivered"];

const SEED_ORDER_HOURS: Partial<Record<OrderStatus, number>> = {
  new: 0,
  packing: 6,
  shipping: 20,
  delivered: 26,
};
const SEED_ORDER_NOTES: Partial<Record<OrderStatus, string>> = {
  new: "Заказ принят магазином",
  packing: "Продавец собирает заказ",
  shipping: "Курьер выехал по адресу",
  delivered: "Заказ получен покупателем",
};

export interface OrderStatusEvent {
  order_id: number;
  status: OrderStatus;
  at: string;
  note: string;
}

export interface Database {
  version: number;
  seq: Record<string, number>;
  users: UserRow[];
  sellers: SellerRow[];
  categories: CategoryRow[];
  products: ProductRow[];
  reviews: ReviewRow[];
  orders: OrderRow[];
  orderEvents: OrderStatusEvent[];
  sessions: SessionRow[];
}

/* ------------------------------------------------------------------ */
/*  Движок: файл + кеш в памяти                                        */
/* ------------------------------------------------------------------ */
const DB_DIR = process.env.UZUM_DB_DIR
  ? path.resolve(process.env.UZUM_DB_DIR)
  : path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "db.json");
const DB_VERSION = 2;

const globalStore = globalThis as typeof globalThis & {
  __uzumDb?: Database | null;
  __uzumDbWritable?: boolean | null;
};

function nowIso() {
  return new Date().toISOString();
}

export function hashPassword(password: string, salt = crypto.randomUUID()) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, row: UserRow): boolean {
  if (!row?.salt) return false;
  const candidate = crypto
    .scryptSync(password, row.salt, 64)
    .toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(row.passwordHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function slugify(value: string) {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
    ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
    я: "ya", " ": "-",
  };
  return (
    value
      .toLowerCase()
      .split("")
      .map((ch) => (map[ch] !== undefined ? map[ch] : ch))
      .join("")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `id-${Date.now()}`
  );
}

function buildSeed(): Database {
  const categories = catalogFixture.categories as unknown as Array<{
    id: number;
    name: string;
    slug: string;
    emoji?: string;
    color?: string;
  }>;
  const sellersFixture = catalogFixture.sellers as unknown as Array<{
    id: number;
    name: string;
    slug: string;
    city: string;
    description: string;
  }>;
  const productsFixture = catalogFixture.products as unknown as Array<
    Record<string, never>
  > &
    Array<{
      id: number;
      slug: string;
      title: string;
      description: string;
      price: number;
      old_price: number | null;
      stock: number;
      brand: string;
      delivery_time: string;
      characteristics: Record<string, string>;
      image: string;
      images: string[];
      category_slug: string;
      seller_slug: string;
      is_ad: boolean;
      views: number;
    }>;
  const reviewsFixture = catalogFixture.reviews as unknown as Array<{
    id: number;
    product_id: number;
    author: string;
    rating: number;
    text: string;
    created_at: string;
    verified: boolean;
    seller_reply: string | null;
  }>;

  const catIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  // Демо-аккаунты. Пароли хэшируем на месте — в файле их нет в открытом виде.
  const demoUsers: UserRow[] = [];
  const sellers: SellerRow[] = sellersFixture.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    city: s.city,
    description: s.description,
    owner_id: null,
    created_at: "2025-11-02T09:00:00.000Z",
    verified: true,
  }));

  const makeUser = (
    email: string,
    password: string,
    first: string,
    last: string,
    phone: string,
    sellerSlug?: string,
  ): UserRow => {
    const { salt, hash } = hashPassword(password);
    const seller = sellerSlug
      ? sellers.find((s) => s.slug === sellerSlug) ?? null
      : null;
    const row: UserRow = {
      id: demoUsers.length + 1,
      email,
      passwordHash: hash,
      salt,
      first_name: first,
      last_name: last,
      phone,
      date_joined: "2026-02-14T12:00:00.000Z",
      seller_id: seller?.id ?? null,
    };
    if (seller) seller.owner_id = row.id;
    demoUsers.push(row);
    return row;
  };

  makeUser("seller@uzum.uz", "Password123", "Сардор", "Каримов", "+998901112233", "uzum-students");
  makeUser("buyer@uzum.uz", "Password123", "Азиз", "Юсупов", "+998907778899");
  makeUser("electro@uzum.uz", "Password123", "Дилноза", "Рахимова", "+9989012223344", "electro-house");

  const products: ProductRow[] = productsFixture.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    price: p.price,
    old_price: p.old_price ?? null,
    stock: p.stock,
    brand: p.brand,
    delivery_time: p.delivery_time,
    characteristics: p.characteristics ?? {},
    image: p.image,
    images: p.images ?? [p.image],
    category_id: catIdBySlug.get(p.category_slug) ?? 1,
    seller_id:
      sellers.find((s) => s.slug === p.seller_slug)?.id ?? 1,
    is_ad: !!p.is_ad,
    status: "active",
    views: p.views ?? 0,
    created_at: "2026-05-01T10:00:00.000Z",
    updated_at: "2026-07-18T10:00:00.000Z",
  }));

  const reviews: ReviewRow[] = reviewsFixture.map((r) => ({
    id: r.id,
    product_id: r.product_id,
    user_id: null,
    author: r.author,
    rating: r.rating,
    text: r.text,
    created_at: r.created_at,
    verified: r.verified,
    seller_reply: r.seller_reply ?? null,
  }));

  // Один демо-заказ, чтобы профиль покупателя не был пустым.
  const demoProduct = products[0];
  const demoProduct2 = products.find((p) => p.slug === "kettle-hotpot") ?? products[1];
  const buyerId = demoUsers[1]?.id ?? 2;
  const orders: OrderRow[] = demoProduct
    ? [
        {
          id: 1,
          number: "UZ-100246",
          user_id: buyerId,
          items: [
            {
              product_id: demoProduct.id,
              title: demoProduct.title,
              image: demoProduct.image,
              price: demoProduct.price,
              qty: 1,
              seller_id: demoProduct.seller_id,
              seller_name:
                sellers.find((s) => s.id === demoProduct.seller_id)?.name ??
                "Магазин",
            },
            {
              product_id: demoProduct2.id,
              title: demoProduct2.title,
              image: demoProduct2.image,
              price: demoProduct2.price,
              qty: 2,
              seller_id: demoProduct2.seller_id,
              seller_name:
                sellers.find((s) => s.id === demoProduct2.seller_id)?.name ??
                "Магазин",
            },
          ],
          status: "shipping",
          subtotal: demoProduct.price + demoProduct2.price * 2,
          discount: 0,
          promo_code: null,
          delivery_cost: 0,
          total: demoProduct.price + demoProduct2.price * 2,
          address: "г. Ташкент, ул. Амира Темура 108, кв. 42",
          pickup_point: "UZ-014 · м. Мустакуллик",
          delivery_method: "courier",
          payment_method: "card",
          comment: "Позвонить за 20 минут",
          created_at: "2026-08-21T08:30:00.000Z",
        },
      ]
    : [];

  /* ------------------------------------------------------------------ *
   * Демо-оживление: у продавца из демо-аккаунта (магазин «Uzum Students»)
   * должен быть чем наполнен кабинет — черновик товара, заказ в сборке и
   * отзыв покупателя, написанный «от своего имени».
   * ------------------------------------------------------------------ */
  const studentShop = sellers.find((s) => s.slug === "uzum-students") ?? null;
  const studentProduct = studentShop
    ? (products.find((pr) => pr.seller_id === studentShop.id) ?? null)
    : null;

  if (studentShop && studentProduct) {
    const nextProductId = products.reduce((acc, pr) => Math.max(acc, pr.id), 0) + 1;
    products.push({
      id: nextProductId,
      slug: "student-desk-organizer",
      title: "Органайзер на стол из фанеры, ручной работы",
      description:
        "Собрали в студенческой мастерской: четыре отсека под канцелярию, подставка под телефон, покрытие — масло-воск. Каждый экземпляр подписываем вручную, поэтому присылаем фото готового до отправки.",
      price: 189000,
      old_price: 229000,
      stock: 4,
      brand: "Uzum Students",
      delivery_time: "2–3 дня",
      characteristics: {
        Материал: "Фанера берёзовая, 8 мм",
        Размер: "32 × 18 × 14 см",
        Покрытие: "Масло-воск",
        Гарантия: "30 дней",
      },
      image: "/products/placeholder.svg",
      images: ["/products/placeholder.svg"],
      category_id: studentProduct.category_id,
      seller_id: studentShop.id,
      is_ad: false,
      status: "draft",
      views: 12,
      created_at: "2026-08-25T09:00:00.000Z",
      updated_at: "2026-08-27T09:00:00.000Z",
    });

    orders.push({
      id: orders.length + 1,
      number: "UZ-100247",
      user_id: buyerId,
      items: [
        {
          product_id: studentProduct.id,
          title: studentProduct.title,
          image: studentProduct.image,
          price: studentProduct.price,
          qty: 1,
          seller_id: studentShop.id,
          seller_name: studentShop.name,
        },
      ],
      status: "packing",
      subtotal: studentProduct.price,
      discount: 0,
      promo_code: null,
      delivery_cost: 0,
      total: studentProduct.price,
      address: "",
      pickup_point: "UZ-001 · ул. Амира Темура, 15",
      delivery_method: "pickup",
      payment_method: "cash",
      comment: "Заберу в субботу до обеда",
      created_at: "2026-08-27T11:20:00.000Z",
    });

    const ownReview = reviews.find((r) => r.product_id === studentProduct.id);
    if (ownReview) {
      ownReview.user_id = buyerId;
      ownReview.author = "Азиз Юсупов";
      ownReview.seller_reply =
        "Спасибо! Добавили в комплект запасной валик — пришлём вместе с следующим заказом.";
    }
  }

  const orderEvents: OrderStatusEvent[] = orders.flatMap((o) => {
    if (o.status === "cancelled") {
      return [
        {
          order_id: o.id,
          status: "new" as const,
          at: o.created_at,
          note: "Заказ принят магазином",
        },
        {
          order_id: o.id,
          status: "cancelled" as const,
          at: new Date(Date.parse(o.created_at) + 2 * 3_600_000).toISOString(),
          note: "Покупатель отменил заказ",
        },
      ];
    }
    const reached = ORDER_FLOW.slice(
      0,
      Math.max(1, ORDER_FLOW.indexOf(o.status) + 1),
    );
    return reached.map((status) => ({
      order_id: o.id,
      status,
      at: new Date(
        Date.parse(o.created_at) + (SEED_ORDER_HOURS[status] ?? 0) * 3_600_000,
      ).toISOString(),
      note: SEED_ORDER_NOTES[status] ?? "",
    }));
  });

  const maxOf = (rows: { id: number }[], fallback = 0) =>
    rows.reduce((acc, row) => Math.max(acc, row.id), fallback);

  return {
    version: DB_VERSION,
    seq: {
      users: maxOf(demoUsers),
      sellers: maxOf(sellers),
      categories: maxOf(categories),
      products: maxOf(products),
      reviews: maxOf(reviews),
      orders: maxOf(orders),
    },
    users: demoUsers,
    sellers,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      emoji: c.emoji ?? "🛍️",
      color: c.color ?? "#F2F0FF",
    })),
    products,
    reviews,
    orders,
    orderEvents,
    sessions: [],
  };
}

function loadFromDisk(): Database | null {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Database;
    if (!parsed || parsed.version !== DB_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(db: Database) {
  if (globalStore.__uzumDbWritable === false) return;
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tmp, DB_FILE);
    globalStore.__uzumDbWritable = true;
  } catch (err) {
    // Read-only ФС (например, serverless) — продолжаем жить в памяти.
    globalStore.__uzumDbWritable = false;
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[uzum] не удалось записать БД на диск, работаем в памяти:",
        err instanceof Error ? err.message : err,
      );
    }
  }
}

export function getDb(): Database {
  if (globalStore.__uzumDb) return globalStore.__uzumDb;
  const fromDisk = loadFromDisk();
  const db = fromDisk ?? buildSeed();
  if (!fromDisk) persist(db);
  globalStore.__uzumDb = db;
  return db;
}

/** Сохранить изменения на диске. */
export function saveDb(db: Database) {
  persist(db);
}

/** Полный сброс локальной базы (используется кнопкой «Сбросить демо-данные»). */
export function resetDb() {
  try {
    fs.rmSync(DB_FILE, { force: true });
  } catch {
    /* ignore */
  }
  globalStore.__uzumDb = null;
  return getDb();
}

export function nextId(db: Database, collection: keyof Database["seq"]) {
  const next = (db.seq[collection] ?? 0) + 1;
  db.seq[collection] = next;
  return next;
}

export { slugify, nowIso };

/**
 * Слаг магазина должен быть стабильным и уникальным: по нему живут публичные
 * ссылки /shop/<slug>. Новое название магазина слаг НЕ меняет.
 */
export function uniqueSellerSlug(name: string, taken?: (slug: string) => boolean) {
  const base = slugify(name) || `shop-${Date.now().toString(36)}`;
  let candidate = base;
  let i = 2;
  const busy = (slug: string) => (taken ? taken(slug) : false);
  while (busy(candidate)) {
    candidate = `${base}-${i}`;
    i += 1;
  }
  return candidate;
}
