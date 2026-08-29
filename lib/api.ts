import { Product } from "@/types/product";

// ==========================================
// 0. БАЗА API
// ==========================================
const RAW_BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://backend-uzum-market.onrender.com/api";
const API_BASE = RAW_BACKEND_URL.replace(/\/+$/, "");

function getApiBase(): string {
  // На сервере Next.js (SSR) идем напрямую к Render (быстрее, без прокси)
  if (typeof window === "undefined") {
    return "https://backend-uzum-market.onrender.com/api";
  }
  // В браузере — относительный путь, сработает rewrites
  return "/api";
}

// ==========================================
// 1. ТИПЫ И ИНТЕРФЕЙСЫ
// ==========================================

export interface PaginatedResponse<T> {
  count: number;
  page_size?: number;
  total_pages?: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type ProductListResponse = PaginatedResponse<Product>;

export interface FetchProductsParams {
  page?: number;
  page_size?: number;
  category?: string;
  category_slug?: string;
  seller?: string;
  min_price?: string | number;
  max_price?: string | number;
  min_rating?: string | number;
  is_ad?: boolean;
  discounted?: boolean;
  search?: string;
  ordering?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}
export type CategoryListResponse = PaginatedResponse<Category>;

export interface Seller {
  id: number;
  name: string;
  rating: string | number;
  reviews_count: number;
}
export type SellerListResponse = PaginatedResponse<Seller>;

export interface RegisterPayload {
  email: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_joined?: string;
}

// Тип для безопасной обработки ошибок от API (без использования `any`)
interface ErrorResponse {
  detail?: string;
  [key: string]: unknown;
}

// ==========================================
// 2. БАЗОВЫЕ ФУНКЦИИ FETCH
// ==========================================

type FetchOptions = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
};

async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {},
  timeoutMs = 15000,
): Promise<Response> {
  const timeoutSignal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(timeoutMs)
      : undefined;

  let signal: AbortSignal | undefined = options.signal ?? undefined;

  if (timeoutSignal && options.signal) {
    const AnyAbort = AbortSignal as unknown as {
      any?: (signals: AbortSignal[]) => AbortSignal;
    };
    signal = AnyAbort.any
      ? AnyAbort.any([options.signal, timeoutSignal])
      : timeoutSignal;
  } else if (timeoutSignal) {
    signal = timeoutSignal;
  } else if (!options.signal) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  return fetch(url, { ...options, signal });
}

// ==========================================
// 3. CSRF (double-submit для unsafe-запросов)
// ==========================================

const CSRF_COOKIE_NAME = "uzum_csrf";

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const escaped = CSRF_COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`),
  );
  return match?.[1] ?? null;
}

let csrfPromise: Promise<string | null> | null = null;

async function ensureCsrfToken(): Promise<string | null> {
  if (typeof document === "undefined") return null;

  const existing = readCsrfCookie();
  if (existing) return existing;

  if (csrfPromise) return csrfPromise;

  csrfPromise = (async () => {
    try {
      await fetchWithTimeout(
        `${getApiBase()}/auth/csrf/`,
        {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
        15000,
      );
      return readCsrfCookie();
    } catch {
      return readCsrfCookie();
    } finally {
      csrfPromise = null;
    }
  })();

  return csrfPromise;
}

async function buildHeaders(
  method: string,
  headers?: HeadersInit,
): Promise<Headers> {
  const result = new Headers(headers);
  result.set("Accept", "application/json");

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) {
    const token = await ensureCsrfToken();
    if (token) result.set("X-CSRFToken", token);
  }

  return result;
}

// ==========================================
// 4. ОБНОВЛЕНИЕ / ЗАЩИЩЁННЫЙ FETCH
// ==========================================

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const headers = await buildHeaders("POST", {
        Accept: "application/json",
      });
      const refreshRes = await fetchWithTimeout(
        `${getApiBase()}/auth/refresh/`,
        {
          method: "POST",
          headers,
          credentials: "include",
          cache: "no-store",
        },
        15000,
      );
      return refreshRes.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = options.method || "GET";
  const headers = await buildHeaders(method, options.headers);

  let response = await fetchWithTimeout(
    url,
    {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    },
    15000,
  );

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      const retryHeaders = await buildHeaders(method, options.headers);
      response = await fetchWithTimeout(
        url,
        {
          ...options,
          headers: retryHeaders,
          credentials: "include",
          cache: "no-store",
        },
        15000,
      );
    } else {
      return response;
    }
  }

  return response;
}

function publicGetOptions(revalidateSeconds: number): FetchOptions {
  return {
    headers: { Accept: "application/json" },
    next: { revalidate: revalidateSeconds },
  };
}

// ==========================================
// 5. ПУБЛИЧНЫЕ ЭНДПОИНТЫ
// ==========================================

export async function fetchProducts(
  params?: FetchProductsParams,
): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.category) query.set("category", params.category);
  if (params?.category_slug) query.set("category_slug", params.category_slug);
  if (params?.seller) query.set("seller", params.seller);
  if (params?.min_price !== undefined)
    query.set("min_price", String(params.min_price));
  if (params?.max_price !== undefined)
    query.set("max_price", String(params.max_price));
  if (params?.min_rating !== undefined)
    query.set("min_rating", String(params.min_rating));
  if (params?.is_ad !== undefined) query.set("is_ad", String(params.is_ad));
  if (params?.discounted !== undefined)
    query.set("discounted", String(params.discounted));
  if (params?.search) query.set("search", params.search);
  if (params?.ordering) query.set("ordering", params.ordering);

  try {
    const res = await fetchWithTimeout(
      `${getApiBase()}/products/?${query.toString()}`,
      publicGetOptions(60),
      20000,
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Ошибка загрузки товаров:", error);
    return { count: 0, next: null, previous: null, results: [] };
  }
}

export async function fetchProduct(
  id: number | string,
): Promise<Product | null> {
  try {
    const res = await fetchWithTimeout(
      `${getApiBase()}/products/${id}/`,
      publicGetOptions(120),
      20000,
    );

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Ошибка загрузки товара:", error);
    return null;
  }
}

export async function fetchCategories(): Promise<CategoryListResponse> {
  try {
    const res = await fetchWithTimeout(
      `${getApiBase()}/categories/`,
      publicGetOptions(3600),
      20000,
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Ошибка загрузки категорий:", error);
    return { count: 0, next: null, previous: null, results: [] };
  }
}

export async function fetchCategory(
  id: number | string,
): Promise<Category | null> {
  try {
    const res = await fetchWithTimeout(
      `${getApiBase()}/categories/${id}/`,
      publicGetOptions(3600),
      20000,
    );

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Ошибка загрузки категории:", error);
    return null;
  }
}

export async function fetchSellers(): Promise<SellerListResponse> {
  try {
    const res = await fetchWithTimeout(
      `${getApiBase()}/sellers/`,
      publicGetOptions(300),
      20000,
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Ошибка загрузки продавцов:", error);
    return { count: 0, next: null, previous: null, results: [] };
  }
}

// ==========================================
// 6. ЭНДПОИНТЫ АВТОРИЗАЦИИ
// ==========================================

export async function registerUser(
  data: RegisterPayload,
): Promise<UserProfile> {
  const headers = await buildHeaders("POST", {
    "Content-Type": "application/json",
    Accept: "application/json",
  });
  const res = await fetchWithTimeout(
    `${getApiBase()}/auth/register/`,
    {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(data),
      cache: "no-store",
    },
    20000,
  );

  if (!res.ok) {
    // Безопасное приведение типа без использования `any`
    const errorData = (await res.json().catch(() => ({}))) as ErrorResponse;
    const errorMessage =
      Object.values(errorData)
        .map((val) => (Array.isArray(val) ? val.join(", ") : String(val)))
        .join(" ") || "Ошибка при регистрации";
    throw new Error(errorMessage);
  }

  return res.json();
}

export async function loginUser(data: LoginPayload): Promise<UserProfile> {
  const headers = await buildHeaders("POST", {
    "Content-Type": "application/json",
    Accept: "application/json",
  });
  const res = await fetchWithTimeout(
    `${getApiBase()}/auth/login/`,
    {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(data),
      cache: "no-store",
    },
    20000,
  );

  if (!res.ok) {
    // Безопасное приведение типа без использования `any`
    const errorData = (await res.json().catch(() => ({}))) as ErrorResponse;
    const errorMessage =
      errorData.detail ||
      Object.values(errorData)
        .map((val) => (Array.isArray(val) ? val.join(", ") : String(val)))
        .join(" ") ||
      "Ошибка при входе";
    throw new Error(errorMessage);
  }

  return res.json();
}

export async function logoutUser(): Promise<void> {
  const headers = await buildHeaders("POST", {
    Accept: "application/json",
  });
  const res = await fetchWithTimeout(
    `${getApiBase()}/auth/logout/`,
    {
      method: "POST",
      headers,
      credentials: "include",
      cache: "no-store",
    },
    15000,
  );

  if (!res.ok) {
    throw new Error(`Не удалось выйти (${res.status})`);
  }
}

export async function fetchMe(): Promise<UserProfile | null> {
  try {
    const res = await authFetch(`${getApiBase()}/auth/me/`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Ошибка получения профиля:", error);
    return null;
  }
}
