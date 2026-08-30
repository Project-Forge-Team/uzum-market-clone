"use client";

import { useState } from "react";
import ProductCard from "@/components/ui/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/ProductCardSkeleton";
import { fetchProducts } from "@/lib/api";
import type { Product } from "@/types/product";

const PAGE_SIZE = 12;

/** «Рекомендуем» с догрузкой следующих страниц без перезагрузки. */
export default function RecommendedSection({
  initialProducts = [],
  initialHasMore = false,
}: {
  initialProducts?: Product[];
  initialHasMore?: boolean;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showMore = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts({
        page: page + 1,
        page_size: PAGE_SIZE,
        ordering: "",
      });
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.results.filter((p) => !seen.has(p.id))];
      });
      setPage((prev) => prev + 1);
      setHasMore(data.next);
    } catch {
      setError("Не удалось догрузить товары. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto mt-12 w-full max-w-[1240px] px-4">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-xl font-bold text-ink md:text-2xl">Рекомендуем</h2>
        <p className="text-[13px] text-muted">
          Подобрано по рейтингу и скидкам
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
        {loading && <ProductCardSkeleton count={4} />}
      </div>

      {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}

      {hasMore ? (
        <button
          type="button"
          onClick={showMore}
          disabled={loading}
          className="mt-8 w-full rounded-xl bg-surface py-3.5 text-[15px] font-semibold text-gray-800 transition-colors hover:bg-[#e4e6eb] disabled:opacity-60"
        >
          {loading ? "Загружаем…" : "Показать ещё товары"}
        </button>
      ) : (
        products.length > 0 && (
          <p className="mt-8 text-center text-sm text-muted">
            Это все товары из этой подборки
          </p>
        )
      )}
    </section>
  );
}
