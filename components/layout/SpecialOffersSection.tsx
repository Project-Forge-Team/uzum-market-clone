"use client";
import ProductCard from "@/components/ui/ProductCard"; // Используем ту же карточку!
import { specialOffers } from "@/data/specialOffers"; // Отдельные данные
import { ChevronRight } from "lucide-react";

export default function SpecialOffersSection() {
  return (
    <section className="w-full max-w-[1240px] mx-auto px-4 mt-12 mb-16">
      {/* ЗАГОЛОВОК С СТРЕЛКОЙ */}
      <div className="flex items-center gap-2 mb-6 cursor-pointer group">
        <h2 className="text-2xl font-bold text-gray-900 group-hover:text-[#7000FF] transition-colors">
          Гарантия низких цен
        </h2>
        <ChevronRight
          size={24}
          className="text-gray-400 group-hover:text-[#7000FF] group-hover:translate-x-1 transition-all"
        />
      </div>

      {/* СЕТКА ТОВАРОВ (такая же, как в Recommended) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {specialOffers.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
