/**
 * Публичные типы данных (то, что отдаёт /api и что едят компоненты).
 * Внутренние строки БД описаны в lib/server/db.ts.
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  emoji: string;
  color?: string;
  product_count?: number;
}

export interface Seller {
  id: number;
  name: string;
  slug: string;
  city: string;
  description: string;
  rating: number;
  reviews_count: number;
  product_count: number;
  verified: boolean;
  owner_id: number | null;
}

export interface MonthlyPayment {
  /** Срок рассрочки в месяцах */
  months: number;
  /** Платёж в месяц, сум */
  per_month: number;
  /** Переплата, 0 — учебный проект без комиссий */
  overpay: number;
}

export interface RatingBucket {
  stars: number;
  count: number;
}

export interface ReviewSummary {
  count: number;
  average: number;
  breakdown: RatingBucket[];
}

export interface Product {
  id: number;
  slug: string;
  title: string;
  description: string;
  price: number;
  old_price: number | null;
  discount_percent: number;
  monthly_payment: MonthlyPayment | null;
  rating: number;
  reviews_count: number;
  rating_breakdown?: RatingBucket[];
  delivery_time: string;
  stock: number;
  in_stock: boolean;
  brand: string;
  image: string;
  images: string[];
  characteristics: Record<string, string>;
  is_ad: boolean;
  views: number;
  status: "active" | "draft" | "archived";
  created_at: string;
  updated_at: string;
  seller: Seller | null;
  category: Pick<Category, "id" | "name" | "slug" | "emoji"> | null;
  /** Был ли у текущего пользователя отзыв на этот товар */
  has_own_review?: boolean;
}

export interface Review {
  id: number;
  product_id: number;
  author: string;
  initials: string;
  rating: number;
  text: string;
  pros: string;
  cons: string;
  created_at: string;
  verified: boolean;
  seller_reply: string | null;
  own: boolean;
}

export type OrderStatus =
  | "new"
  | "packing"
  | "shipping"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новый",
  packing: "Собирается",
  shipping: "В пути",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

export interface OrderItem {
  product_id: number;
  title: string;
  image: string;
  price: number;
  qty: number;
  seller_id: number;
  seller_name: string;
}

export interface ShopOrder {
  id: number;
  number: string;
  status: OrderStatus;
  created_at: string;
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
  items: OrderItem[];
  items_count: number;
  buyer_name?: string;
  timeline?: Array<{ status: OrderStatus; at: string; note: string }>;
}

export interface SellerStats {
  product_count: number;
  draft_count: number;
  review_count: number;
  rating: number;
  views: number;
  order_count: number;
  revenue: number;
  stock_units: number;
}

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_joined?: string;
  is_seller?: boolean;
  seller_id?: number | null;
}

export interface PaginatedResponse<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: boolean;
  previous: boolean;
  results: T[];
}

export type ProductListResponse = PaginatedResponse<Product> & {
  facets?: {
    price: { min: number; max: number };
    categories: Array<Category & { product_count: number }>;
  };
};
