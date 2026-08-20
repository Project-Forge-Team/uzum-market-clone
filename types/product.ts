export interface Product {
  id: number;
  title: string;
  description: string;
  price: string; // Decimal приходит строкой
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
