"use client"; // если вы планируете использовать состояние, нужен клиентский компонент

import { useState } from "react";
import ProductCard from "@/components/ui/ProductCard"; // замените на корректный путь
import { mockProducts } from "@/data/mockProducts";

const INITIAL_COUNT = 10;
const LOAD_STEP = 10;

export default function RecommendedSection() {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  const products = mockProducts; // в будущем здесь будет fetch/SWR

  const shownProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + LOAD_STEP, products.length));
  };

  return (
    <section className="w-full max-w-[1240px] mx-auto px-4 mt-10">
      <h2 className="text-2xl font-bold mb-6">Рекомендуем</h2>

      {/* Сетка товаров */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {shownProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Кнопка "Показать ещё" (отображается только если есть скрытые товары) */}
      {hasMore && (
        <button
          onClick={handleShowMore}
          className="w-full bg-[#F0F2F5] hover:bg-[#E4E6EB] text-gray-800 font-medium py-4 rounded-xl transition-colors duration-200 mt-[60px] mb-[53px]"
        >
          Показать ещё {Math.min(LOAD_STEP, products.length - visibleCount)}
        </button>
      )}
    </section>
  );
}
