import { Product } from "@/types/product";
import { authService } from "@/lib/auth-service";

// Используем переменную окружения, fallback на Render (т.к. локальный бэк может быть выключен)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend-uzum-market.onrender.com/api";

// ==========================================
// 1. ТИПЫ И ИНТЕРФЕЙСЫ
// ==========================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- Товары ---
export type ProductListResponse = PaginatedResponse<Product>;

export interface FetchProductsParams {
  page?: number;
  page_size?: number;
  category?: string; // В API (2).md параметр называется category (integer)
  seller?: string;   // В API (2).md параметр называется seller (integer)
  search?: string;
  ordering?: string; // price, rating, created_at (с - для убывания)
}

// --- Категории ---
export interface Category {
  id: number;
  name: string;
  slug: string;
}
export type CategoryListResponse = PaginatedResponse<Category>;

// --- Продавцы ---
export interface Seller {
  id: number;
  name: string;
  rating: number;
  reviews_count: number;
}
export type SellerListResponse = PaginatedResponse<Seller>;

// --- Авторизация ---
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

// Ответ при регистрации (содержит user)
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

// Ответ при логине и обновлении токена (НЕ содержит user, согласно API (2).md)
export interface AuthTokensResponse {
  refresh: string;
  access: string;
}

// Профиль пользователя (GET /auth/me/)
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

/** Fetch с таймаутом (защита от вечно висящих запросов к Render) */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000 // 30 секунд
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/** Вспомогательная функция для жесткого редиректа при потере сессии */
function handleSessionExpired() {
  authService.clearTokens();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem("uzum_user_name");
  }
  
  // Проверяем, что мы в браузере, и не находимся уже на странице логина/регистрации
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    if (currentPath !== '/login' && currentPath !== '/register') {
      // Мгновенный редирект с сохранением пути, куда юзер хотел попасть
      window.location.href = `/login?redirect=${currentPath}`;
    }
  }
}

/** 
 * УМНЫЙ ЗАЩИЩЕННЫЙ FETCH (Refresh Token Flow)
 * Автоматически добавляет Bearer токен.
 * Если получает 401, тихо обновляет токены через /auth/refresh/ и повторяет запрос.
 * Если refresh токен тоже невалиден — очищает сессию и выбрасывает на /login.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let accessToken = authService.getAccessToken();

  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  // 1. Первый запрос
  let response = await fetchWithTimeout(url, { ...options, headers }, 30000);

  // 2. Если токен протух (401 Unauthorized) -> пытаемся обновить
  if (response.status === 401) {
    const refreshToken = authService.getRefreshToken();

    if (refreshToken) {
      try {
        // Тихо стучимся на эндпоинт обновления (пункт 0.3 API.md)
        const refreshRes = await fetch(`${API_URL}/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshRes.ok) {
          const newTokens: AuthTokensResponse = await refreshRes.json();

          // Сохраняем НОВУЮ пару токенов (access + новый refresh)
          authService.saveTokens(newTokens.access, newTokens.refresh);

          // Обновляем заголовок новым токеном
          headers.set("Authorization", `Bearer ${newTokens.access}`);

          // 3. Повторяем исходный запрос с новым токеном!
          response = await fetchWithTimeout(url, { ...options, headers }, 30000);
        } else {
          // Если refresh токен тоже протух/битый (сервер вернул 401) - СЕССИЯ МЕРТВА
          handleSessionExpired();
          throw new Error("Session expired");
        }
      } catch (e) {
        // При любой сетевой ошибке во время обновления — тоже чистим сессию
        handleSessionExpired();
        throw e;
      }
    } else {
      // Если refresh токена вообще нет в куках, но access протух
      handleSessionExpired();
    }
  }

  return response;
}

// ==========================================
// 3. ПУБЛИЧНЫЕ ЭНДПОИНТЫ (Товары, Категории, Продавцы)
// ==========================================

/** Список товаров */
export async function fetchProducts(params?: FetchProductsParams): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.category) query.set("category", params.category);
  if (params?.seller) query.set("seller", params.seller);
  if (params?.search) query.set("search", params.search);
  if (params?.ordering) query.set("ordering", params.ordering);

  try {
    const res = await fetchWithTimeout(`${API_URL}/products/?${query.toString()}`, {
      headers: { Accept: "application/json" },
    }, 60000); // 60 сек на просыпание Render
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Ошибка загрузки товаров:", error);
    return { count: 0, next: null, previous: null, results: [] };
  }
}

/** Детали товара */
export async function fetchProduct(id: number | string): Promise<Product | null> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/products/${id}/`, {
      headers: { Accept: "application/json" },
    }, 60000);
    
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
    const res = await fetchWithTimeout(`${API_URL}/categories/`, {
      headers: { Accept: "application/json" },
    }, 60000);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Ошибка загрузки категорий:", error);
    return { count: 0, next: null, previous: null, results: [] };
  }
}

/** Детали категории */
export async function fetchCategory(id: number | string): Promise<Category | null> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/categories/${id}/`, {
      headers: { Accept: "application/json" },
    }, 60000);
    
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
    const res = await fetchWithTimeout(`${API_URL}/sellers/`, {
      headers: { Accept: "application/json" },
    }, 60000);
    
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
export async function registerUser(data: RegisterPayload): Promise<RegisterResponse> {
  const res = await fetchWithTimeout(`${API_URL}/auth/register/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(data),
  }, 35000);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = Object.values(errorData).flat().join(" ") || "Ошибка при регистрации";
    throw new Error(errorMessage);
  }

  return res.json();
}

/** Вход (Логин) */
export async function loginUser(data: LoginPayload): Promise<AuthTokensResponse> {
  const res = await fetchWithTimeout(`${API_URL}/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(data),
  }, 35000);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.detail || Object.values(errorData).flat().join(" ") || "Ошибка при входе";
    throw new Error(errorMessage);
  }

  return res.json();
}

/** Получение профиля текущего пользователя (Защищенный эндпоинт) */
export async function fetchMe(): Promise<UserProfile | null> {
  try {
    // Используем authFetch! Если токен протух, он сам обновится.
    // Если сессия мертва, authFetch сам выкинет на /login.
    const res = await authFetch(`${API_URL}/auth/me/`);

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Ошибка получения профиля:", error);
    return null;
  }
}