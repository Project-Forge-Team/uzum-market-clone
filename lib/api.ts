// lib/api.ts
import { Product } from "@/types/product";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function fetchProducts(params?: {
  page?: number;
  category?: string;
  search?: string;
  ordering?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.category) query.set("category", params.category);
  if (params?.search) query.set("search", params.search);
  if (params?.ordering) query.set("ordering", params.ordering);

  const res = await fetch(`${API_URL}/products/?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json(); // Возвращает { count, next, previous, results }
}

export async function fetchProduct(id: number | string) {
  const res = await fetch(`${API_URL}/products/${id}/`);
  if (!res.ok) return null; // или throw, обработаете выше
  return res.json();
}
