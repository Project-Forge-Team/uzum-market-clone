import { Product } from "@/types/product";
import { authService } from "@/lib/auth-service";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://backend-uzum-market.onrender.com/api";

// ==========================================
// 1. ТИПЫ И ИНТЕРФЕЙСЫ
// ==========================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type ProductListResponse = PaginatedResponse<Product>;

export interface FetchProductsParams {
  page?: number;
  page_size?: number;
  category?: string;
  seller?: string;
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
  rating: number;
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

export interface RegisterResponse {
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
  };
  refresh: string;
  access: string;
}

export interface AuthTokensResponse {
  refresh: string;
  access: string;
}

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

// ==========================================
// 2. БАЗОВЫЕ ФУНКЦИИ FETCH
// ==========================================

type FetchOptions = RequestInit & {
  /** Next.js ISR (только на сервере) */
  next?: { revalidate?: number | false; tags?: string[] };
  /** Отключить next/fetch cache */
  cache?: RequestCache;
};

/** Fetch с таймаутом; сохраняет внешний AbortSignal */
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
    // Fallback для старых runtime без AbortSignal.timeout
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

function handleSessionExpired() {
  authService.clearTokens();
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("uzum_user_name");
  }

  if (typeof window !== "undefined") {
    const currentPath = window.location.pathname;
    if (currentPath !== "/login" && currentPath !== "/register") {
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  }
}

/** Один refresh на все параллельные 401 — без race condition */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = authService.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const refreshRes = await fetchWithTimeout(
        `${API_URL}/auth/refresh/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ refresh: refreshToken }),
          cache: "no-store",
        },
        15000,
      );

      if (!refreshRes.ok) return null;

      const newTokens: AuthTokensResponse = await refreshRes.json();
      authService.saveTokens(newTokens.access, newTokens.refresh);
      return newTokens.access;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Защищённый fetch: Bearer + тихий refresh при 401.
 * Параллельные 401 делят один refresh-запрос.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  const accessToken = authService.getAccessToken();

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  let response = await fetchWithTimeout(
    url,
    { ...options, headers, cache: "no-store" },
    15000,
  );

  if (response.status === 401) {
    const newAccess = await refreshAccessToken();

    if (newAccess) {
      headers.set("Authorization", `Bearer ${newAccess}`);
      response = await fetchWithTimeout(
        url,
        { ...options, headers, cache: "no-store" },
        15000,
      );
    } else {
      handleSessionExpired();
      throw new Error("Session expired");
    }
  }

  return response;
}

/** Общие заголовки + ISR-опции для публичных GET */
function publicGetOptions(revalidateSeconds: number): FetchOptions {
  return {
    headers: { Accept: "application/json" },
    // На сервере Next закэширует; на клиенте next игнорируется
    next: { revalidate: revalidateSeconds },
  };
}

// ==========================================
// 3. ПУБЛИЧНЫЕ ЭНДПОИНТЫ
// ==========================================

/** Список товаров */
export async function fetchProducts(
  params?: FetchProductsParams,
): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.category) query.set("category", params.category);
  if (params?.seller) query.set("seller", params.seller);
  if (params?.search) query.set("search", params.search);
  if (params?.ordering) query.set("ordering", params.ordering);

  try {
    const res = await fetchWithTimeout(
      `${API_URL}/products/?${query.toString()}`,
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

/** Детали товара */
export async function fetchProduct(
  id: number | string,
): Promise<Product | null> {
  try {
    const res = await fetchWithTimeout(
      `${API_URL}/products/${id}/`,
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

/** Список всех категорий */
export async function fetchCategories(): Promise<CategoryListResponse> {
  try {
    const res = await fetchWithTimeout(
      `${API_URL}/categories/`,
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

/** Детали категории */
export async function fetchCategory(
  id: number | string,
): Promise<Category | null> {
  try {
    const res = await fetchWithTimeout(
      `${API_URL}/categories/${id}/`,
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

/** Список всех продавцов */
export async function fetchSellers(): Promise<SellerListResponse> {
  try {
    const res = await fetchWithTimeout(
      `${API_URL}/sellers/`,
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
// 4. ЭНДПОИНТЫ АВТОРИЗАЦИИ
// ==========================================

/** Регистрация пользователя */
export async function registerUser(
  data: RegisterPayload,
): Promise<RegisterResponse> {
  const res = await fetchWithTimeout(
    `${API_URL}/auth/register/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
      cache: "no-store",
    },
    20000,
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage =
      Object.values(errorData).flat().join(" ") || "Ошибка при регистрации";
    throw new Error(errorMessage);
  }

  return res.json();
}

/** Вход (Логин) */
export async function loginUser(
  data: LoginPayload,
): Promise<AuthTokensResponse> {
  const res = await fetchWithTimeout(
    `${API_URL}/auth/login/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
      cache: "no-store",
    },
    20000,
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage =
      errorData.detail ||
      Object.values(errorData).flat().join(" ") ||
      "Ошибка при входе";
    throw new Error(errorMessage);
  }

  return res.json();
}

/** Профиль текущего пользователя */
export async function fetchMe(): Promise<UserProfile | null> {
  try {
    const res = await authFetch(`${API_URL}/auth/me/`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Ошибка получения профиля:", error);
    return null;
  }
}
