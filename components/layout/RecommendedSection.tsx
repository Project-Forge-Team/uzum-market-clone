"use client";
import { useState, useEffect } from "react";
import ProductCard from "@/components/ui/ProductCard";
import { fetchProducts } from "@/lib/api";
import { Product } from "@/types/product";

export default function RecommendedSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true); // начинаем с загрузки
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let ignore = false; // для предотвращения обновления состояния после размонтирования

    async function loadInitialProducts() {
      try {
        const data = await fetchProducts({ page: 1, ordering: "-rating" });
        if (!ignore) {
          setProducts(data.results);
          setHasMore(!!data.next);
          setLoading(false);
        }
      } catch (error) {
        console.error("Ошибка загрузки товаров:", error);
        if (!ignore) setLoading(false);
      }
    }

    loadInitialProducts();

    return () => {
      ignore = true;
    };
  }, []);

  const handleShowMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setLoading(true); // это в обработчике события, допустимо
    try {
      const data = await fetchProducts({ page: nextPage, ordering: "-rating" });
      setProducts((prev) => [...prev, ...data.results]);
      setHasMore(!!data.next);
      setLoading(false);
    } catch (error) {
      console.error("Ошибка загрузки товаров:", error);
      setLoading(false);
    }
  };

  return (
    <section className="w-full max-w-[1240px] mx-auto px-4 mt-10">
      <h2 className="text-2xl font-bold mb-6">Рекомендуем</h2>

      {loading && products.length === 0 ? (
        <div className="text-center py-10">Загрузка...</div>
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
