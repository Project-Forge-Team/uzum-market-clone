// data/mockProducts.ts
export interface Product {
  id: number;
  title: string;
  image: string;
  images?: string[];
  price: number;
  oldPrice?: number;
  rating: number;
  reviewsCount: number;
  monthlyPayment?: number;
  deliveryTime: string;
  description?: string;
  characteristics?: Record<string, string>;
  seller?: {
    name: string;
    rating: number;
    reviewsCount: number;
  };
  category?: string;
  isAd?: boolean;
}
