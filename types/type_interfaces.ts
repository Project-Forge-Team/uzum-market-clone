export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  old_price: string | null;
  rating: number;
  reviews_count: number;
  monthly_payment: string | null;
  delivery_time: string;
  image: string;
  images: string[];
  characteristics: Record<string, string>;
  seller: {
    id: number;
    name: string;
    rating: number;
    reviews_count: number;
  } | null;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  is_ad: boolean;
}

// --- Товары ---
export type ProductListResponse = PaginatedResponse<Product>;

export interface FetchProductsParams {
  page?: number;
  page_size?: number;
  category?: string;
  seller?: string;
  search?: string;
  ordering?: string;
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

// Ответ при регистрации: { id, email, first_name, last_name, phone }
// Токены выставляются в HttpOnly cookies автоматически, не возвращаются в теле
export interface RegisterResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

// Ответ при логине: { id, email, first_name, last_name, phone }
// Токены выставляются в HttpOnly cookies автоматически, не возвращаются в теле
export type LoginResponse = RegisterResponse;

// Ответ при logout
export interface LogoutResponse {
  detail: string;
}

// Профиль пользователя (GET /auth/me/)
export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}
