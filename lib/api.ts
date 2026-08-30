/**
 * Клиентский API-слой (работает в браузере).
 *
 * Все запросы идут на same-origin `/api/*` — catch-all прокси
 * app/api/[...path]/route.ts пересылает их на бэкенд (BACKEND_URL, по
 * умолчанию https://backend-uzum-market.onrender.com). Куки сессии и CSRF
 * работают как same-site, CORS не нужен. Ошибки приходят в формате
 * { detail, fields }: detail показываем как есть, fields — подсветка полей.
 */
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

export type {
  Category,
  Product,
  Review,
  Seller,
  ShopOrder,
  UserProfile,
};

export interface FetchProductsParams {
  q?: string;
  category?: string | number;
  seller?: string | number;
  min_price?: string | number;
  max_price?: string | number;
  min_rating?: string | number;
  discounted?: boolean;
  in_stock?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
  ids?: number[];
  status?: string;
}

const CSRF_COOKIE_NAME = "uzum_csrf";
export const AUTH_CHANGE_EVENT = "uzum:auth-change";

export class ApiRequestError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.fields = fields;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match?.[1] ?? null;
}

let csrfPromise: Promise<string | null> | null = null;

/** GET /api/auth/csrf — браузер получает куку и кладёт её в заголовок. */
export async function ensureCsrfToken(): Promise<string | null> {
  const existing = readCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;
  if (csrfPromise) return csrfPromise;

  csrfPromise = (async () => {
    try {
      await fetch("/api/auth/csrf", { credentials: "include", cache: "no-store" });
      return readCookie(CSRF_COOKIE_NAME);
    } catch {
      return null;
    } finally {
      csrfPromise = null;
    }
  })();
  return csrfPromise;
}

export function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { withCsrf?: boolean } = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && init.withCsrf !== false) {
    const token = await ensureCsrfToken();
    if (token) headers.set("X-CSRFToken", token);
  }
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      method,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new ApiRequestError(0, "Нет связи с сервером. Обновите страницу.");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!res.ok) {
    let detail =
      (typeof data.detail === "string" && data.detail) ||
      Object.entries(data)
        .map(([, v]) => (Array.isArray(v) ? v.join(", ") : String(v)))
        .join(" ") ||
      `Запрос не удался (${res.status})`;

    // Rate limit входа/регистрации (10/мин/IP): в detail бэкенда —
    // «Available in N seconds», показываем человекочитаемое.
    if (res.status === 429) {
      const seconds = /available in (\d+)/i.exec(detail)?.[1];
      detail = seconds
        ? `Слишком много попыток. Подождите ${seconds} сек.`
        : "Слишком много попыток. Подождите минуту.";
    }

    throw new ApiRequestError(
      res.status,
      detail,
      data.fields as Record<string, string> | undefined,
    );
  }
  return data as T;
}

function queryFrom(params: FetchProductsParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "ids") {
      if (Array.isArray(value) && value.length) {
        search.set("ids", value.join(","));
      }
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

/* ---------------- Каталог ---------------- */

export function fetchProducts(
  params: FetchProductsParams = {},
): Promise<ProductListResponse> {
  return request<ProductListResponse>(`/products${queryFrom(params)}`);
}

export function fetchProduct(id: number | string): Promise<Product> {
  return request<Product>(`/products/${id}`);
}

export function fetchCategories(): Promise<{
  count: number;
  results: Array<Category & { product_count: number }>;
}> {
  return request("/categories");
}

export function fetchSellers(): Promise<{
  count: number;
  results: Array<Seller & Partial<SellerStats>>;
}> {
  return request("/sellers");
}

export function fetchSeller(id: number | string): Promise<Seller & { products: Product[] }> {
  return request(`/sellers/${id}`);
}

/* ---------------- Отзывы ---------------- */

export function fetchReviews(productId: number): Promise<{
  summary: ReviewSummary;
  results: Review[];
  can_review: boolean;
  purchases: number;
}> {
  return request(`/products/${productId}/reviews`);
}

export function submitReview(
  productId: number,
  payload: { rating: number; text: string; pros?: string; cons?: string },
): Promise<{ id: number; updated: boolean; detail: string }> {
  return request(`/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteReview(reviewId: number): Promise<{ detail: string }> {
  return request(`/reviews/${reviewId}`, { method: "DELETE" });
}

export function replyToReview(
  reviewId: number,
  reply: string,
): Promise<{ detail: string }> {
  return request(`/reviews/${reviewId}/reply`, {
    method: "POST",
    body: JSON.stringify({ reply }),
  });
}

/* ---------------- Авторизация ---------------- */

export interface RegisterPayload {
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  shop_name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export function registerUser(data: RegisterPayload): Promise<UserProfile> {
  return request<UserProfile>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function loginUser(data: LoginPayload): Promise<UserProfile> {
  return request<UserProfile>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logoutUser(): Promise<void> {
  await request<{ detail: string }>("/auth/logout", { method: "POST" });
  notifyAuthChange();
}

export function fetchMe(): Promise<UserProfile | null> {
  return request<UserProfile>("/auth/me").catch(() => null);
}

export function updateMe(
  patch: Partial<Pick<UserProfile, "first_name" | "last_name" | "phone" | "email">>,
): Promise<UserProfile> {
  return request<UserProfile>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function changePassword(current: string, next: string) {
  return request<{ detail: string }>("/auth/password", {
    method: "POST",
    body: JSON.stringify({ current, next }),
  });
}

/* ---------------- Кабинет продавца ---------------- */

export interface ProductPayload {
  title: string;
  description: string;
  price: number;
  old_price: number | null;
  stock: number;
  category_id: number;
  delivery_time: string;
  brand?: string;
  images: string[];
  characteristics: Record<string, string>;
  status: "active" | "draft" | "archived";
  is_ad?: boolean;
}

export function fetchMyProducts(): Promise<{ results: Product[] }> {
  return request("/products/mine");
}

export function createProduct(payload: ProductPayload): Promise<{ id: number }> {
  return request("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id: number, payload: Partial<ProductPayload>) {
  return request<{ id: number }>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function setProductStatus(id: number, status: string) {
  return request<{ detail: string }>(`/products/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function deleteProduct(id: number) {
  return request<{ detail: string }>(`/products/${id}`, { method: "DELETE" });
}

export function fetchShop(): Promise<Seller | null> {
  return request<Seller | null>("/shop");
}

export function createShop(name: string) {
  return request<{ id: number; detail: string }>("/shop", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateShop(patch: {
  name?: string;
  description?: string;
  city?: string;
}) {
  return request<{ detail: string }>("/shop", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return request<{ url: string }>("/uploads", {
    method: "POST",
    body: form, // FormData: Content-Type с boundary браузер поставит сам
  });
}

export function countProductView(id: number) {
  return request(`/products/${id}/view`, { method: "POST" }).catch(() => null);
}

/* ---------------- Заказы ---------------- */

export interface CheckoutPayload {
  items: Array<{ product_id: number; qty: number }>;
  address: string;
  pickup_point?: string;
  delivery_method: "courier" | "pickup";
  payment_method: "card" | "cash" | "installment";
  comment?: string;
  promo_code?: string;
}

export function createOrder(payload: CheckoutPayload): Promise<{ id: number }> {
  return request<{ id: number }>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function previewTotals(payload: {
  subtotal: number;
  delivery_method: "courier" | "pickup";
  promo_code?: string;
}) {
  return request<{
    discount: number;
    delivery_cost: number;
    total: number;
    promo_label: string | null;
  }>("/orders", { method: "PUT", body: JSON.stringify(payload), withCsrf: false });
}

export function fetchOrders(): Promise<{ count: number; results: ShopOrder[] }> {
  return request("/orders");
}

export function fetchOrder(id: number | string): Promise<ShopOrder> {
  return request(`/orders/${id}`);
}

export function updateOrderStatus(id: number, action: "advance" | "cancel") {
  return request<{ status: string }>(`/orders/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}

/* ---------------- Служебное для демо ---------------- */

export function resetDemoData() {
  return request<{ detail: string }>("/demo/reset", { method: "POST" });
}

export function fetchSellerOrders(): Promise<{ results: ShopOrder[] }> {
  return request("/shop/orders");
}
