"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Percent } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import type { Product } from "@/types/product";

/** «Скидки недели» — горизонтальная карусель со стрелками. */
export default function SpecialOffersSection({ offers = [] }: { offers?: Product[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = (direction: number) => {
    const node = trackRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.min(node.clientWidth * 0.8, 800), behavior: "smooth" });
  };

  if (!offers.length) return null;

  return (
    <section className="mx-auto mt-12 w-full max-w-[1240px] px-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-ink md:text-2xl">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FFEAEA] text-[#E02B2B]">
            <Percent size={17} />
          </span>
          Скидки недели
        </h2>
        <div className="flex items-center gap-3">
          <Link href="/search?discounted=1" className="text-[13px] font-semibold text-brand hover:underline">
            Все скидки
          </Link>
          <div className="hidden gap-1.5 sm:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Прокрутить влево"
              className="grid h-8 w-8 place-items-center rounded-full bg-white text-gray-600 ring-1 ring-line transition-colors hover:text-brand hover:ring-brand-border"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Прокрутить вправо"
              className="grid h-8 w-8 place-items-center rounded-full bg-white text-gray-600 ring-1 ring-line transition-colors hover:text-brand hover:ring-brand-border"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1"
      >
        {offers.map((product) => (
          <div key={product.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23.4%]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
