"use client";

import { useState } from "react";
import ProductCard from "@/components/ui/ProductCard";
import { fetchProducts } from "@/lib/api";
import { Product } from "@/types/product";

interface RecommendedSectionProps {
  initialProducts?: Product[];
  initialHasMore?: boolean;
}

export default function RecommendedSection({
  initialProducts = [],
  initialHasMore = false,
}: RecommendedSectionProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);

  const handleShowMore = async () => {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const data = await fetchProducts({ page: nextPage, ordering: "-rating" });
      setPage(nextPage);
      setProducts((prev) => [...prev, ...data.results]);
      setHasMore(!!data.next);
    } catch (error) {
      console.error("Ошибка загрузки товаров:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full max-w-[1240px] mx-auto px-4 mt-10">
      <h2 className="text-2xl font-bold mb-6">Рекомендуем</h2>

      {products.length === 0 && !loading ? (
        <div className="text-center py-10 text-gray-500">
          Товары пока недоступны
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {hasMore && (
            <button
              onClick={handleShowMore}
              disabled={loading}
              className="w-full bg-[#F0F2F5] hover:bg-[#E4E6EB] text-gray-800 font-medium py-4 rounded-xl transition-colors duration-200 mt-[60px] mb-[53px] disabled:opacity-50"
            >
              {loading ? "Загрузка..." : "Показать ещё"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
