import { Product } from "@/types/product";
import { Star, Heart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`}>
      <div className="flex flex-col bg-white rounded-xl p-3 hover:shadow-lg transition-shadow cursor-pointer h-full">
        {/* Картинка */}
        <div className="relative aspect-square mb-2">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-contain"
          />

          {/* Бейдж "Реклама" (если isAd === true) */}
          {product.isAd && (
            <span className="absolute top-1 right-1 text-[10px] bg-gray-200/90 px-1.5 py-0.5 rounded backdrop-blur-sm text-gray-600 font-medium">
              Реклама
            </span>
          )}

          {/* Кнопка "В избранное" */}
          <button
            className="absolute top-1 left-1 p-1.5 bg-white/80 rounded-full hover:bg-white transition-colors backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault(); // чтобы клик по сердечку не переходил на страницу товара
              // здесь можно добавить логику добавления в избранное
            }}
          >
            <Heart size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Цены и информация */}
        <div className="mt-auto">
          <div className="font-bold text-lg">
            {product.price.toLocaleString()} сум
          </div>
          {product.oldPrice && (
            <div className="text-xs text-gray-400 line-through">
              {product.oldPrice.toLocaleString()}
            </div>
          )}

          {product.monthlyPayment && (
            <div className="inline-block bg-[#F0F0FF] text-[#7000FF] text-xs font-medium px-2 py-0.5 rounded mt-1">
              от {product.monthlyPayment.toLocaleString()} сум/мес
            </div>
          )}

          {/* Рейтинг и название */}
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span>{product.rating}</span>
            <span>({product.reviewsCount} отзывов)</span>
          </div>
          <h3 className="text-sm text-gray-800 mt-1 line-clamp-2 leading-tight min-h-[40px]">
            {product.title}
          </h3>
        </div>

        {/* Кнопка доставки */}
        <button
          className="w-full mt-3 bg-[#7000FF] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#5a00cc] transition-colors flex items-center justify-center gap-2"
          onClick={(e) => {
            e.preventDefault(); // чтобы кнопка не вела на страницу товара, если нужно
            // здесь можно добавить логику добавления в корзину
          }}
        >
          {product.deliveryTime}
        </button>
      </div>
    </Link>
  );
}
