"use client";

import ProductCard from "@/components/ui/ProductCard";
import { ChevronRight } from "lucide-react";
import { Product } from "@/types/product";

interface SpecialOffersSectionProps {
  /** Уже отфильтрованные товары со скидкой (с сервера) */
  offers?: Product[];
}

export default function SpecialOffersSection({
  offers = [],
}: SpecialOffersSectionProps) {
  return (
    <section className="w-full max-w-[1240px] mx-auto px-4 mt-12 mb-16">
      <div className="flex items-center gap-2 mb-6 cursor-pointer group">
        <h2 className="text-2xl font-bold text-gray-900 group-hover:text-[#7000FF] transition-colors">
          Гарантия низких цен
        </h2>
        <ChevronRight
          size={24}
          className="text-gray-400 group-hover:text-[#7000FF] group-hover:translate-x-1 transition-all"
        />
      </div>

      {offers.length > 0 ? (
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
