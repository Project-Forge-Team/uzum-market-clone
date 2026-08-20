"use client";
import { useState, useEffect } from "react";
import ProductCard from "@/components/ui/ProductCard";
import { ChevronRight } from "lucide-react";
import { fetchProducts } from "@/lib/api";
import { Product } from "@/types/product";

export default function SpecialOffersSection() {
  const [offers, setOffers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadOffers() {
      try {
        // Получаем товары, отсортированные по рейтингу или цене — на ваше усмотрение
        const data = await fetchProducts({ page: 1, ordering: "-rating" });
        const results: Product[] = data.results || [];

        // Отбираем только товары со скидкой, вычисляем процент скидки и сортируем по убыванию
        const discounted = results
          .filter((p) => p.old_price && Number(p.old_price) > Number(p.price))
          .map((p) => ({
            ...p,
            discountPercent: Math.round(
              ((Number(p.old_price) - Number(p.price)) / Number(p.old_price)) *
                100,
            ),
          }))
          .sort((a, b) => b.discountPercent - a.discountPercent)
          .slice(0, 5); // берём топ‑5 самых выгодных предложений

        if (!ignore) {
          setOffers(discounted);
          setLoading(false);
        }
      } catch (error) {
        console.error("Ошибка загрузки специальных предложений:", error);
        if (!ignore) setLoading(false);
      }
    }

    loadOffers();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="w-full max-w-[1240px] mx-auto px-4 mt-12 mb-16">
      {/* Заголовок с стрелкой */}
      <div className="flex items-center gap-2 mb-6 cursor-pointer group">
        <h2 className="text-2xl font-bold text-gray-900 group-hover:text-[#7000FF] transition-colors">
          Гарантия низких цен
        </h2>
        <ChevronRight
          size={24}
          className="text-gray-400 group-hover:text-[#7000FF] group-hover:translate-x-1 transition-all"
        />
      </div>

      {/* Сетка товаров */}
      {loading && offers.length === 0 ? (
        <div className="text-center py-10 text-gray-500">Загрузка...</div>
      ) : offers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {offers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">
          Пока нет товаров со скидкой
        </div>
      )}
    </section>
  );
}
