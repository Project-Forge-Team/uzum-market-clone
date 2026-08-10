export interface Product {
  id: number;
  title: string;
  image: string;
  price: number;
  oldPrice?: number;
  monthlyPayment?: number;
  rating: number;
  reviewsCount: number;
  deliveryTime: string;
  isAd?: boolean;
  
  // 👇 ДОБАВЬ ЭТУ СТРОКУ
  badge?: string; 
}