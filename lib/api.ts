// lib/api.ts
import { Product } from "@/types/product";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface ProductListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export async function fetchProducts(params?: {
  page?: number;
  category?: string;
  search?: string;
  ordering?: string;
}): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.category) query.set("category", params.category);
  if (params?.search) query.set("search", params.search);
  if (params?.ordering) query.set("ordering", params.ordering);

  const res = await fetch(`${API_URL}/products/?${query.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return { count: 0, next: null, previous: null, results: [] };
  return res.json();
}

export async function fetchProduct(
  id: number | string,
): Promise<Product | null> {
  const res = await fetch(`${API_URL}/products/${id}/`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null; // или throw, обработаете выше
  return res.json();
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface CategoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Category[];
}

/** Список всех категорий */
export async function fetchCategories(): Promise<CategoryListResponse> {
  const res = await fetch(`${API_URL}/categories/`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return { count: 0, next: null, previous: null, results: [] };
  return res.json();
}

/** Детали категории */
export async function fetchCategory(
  id: number | string,
): Promise<Category | null> {
  const res = await fetch(`${API_URL}/categories/${id}/`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

export interface Seller {
  id: number;
  name: string;
  rating: number;
  reviews_count: number;
}

export interface SellerListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Seller[];
}

/** Список всех продавцов */
export async function fetchSellers(): Promise<SellerListResponse> {
  const res = await fetch(`${API_URL}/sellers/`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return { count: 0, next: null, previous: null, results: [] };
  return res.json();
}
