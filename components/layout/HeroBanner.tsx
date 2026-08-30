"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    id: "school",
    image: "/banners/school.svg",
    alt: "Школьный базар: скидки до 40% на канцелярию",
    href: "/catalog/knigi",
  },
  {
    id: "tech",
    image: "/banners/tech.svg",
    alt: "Техника в рассрочку на 12 месяцев",
    href: "/catalog/elektronika",
  },
  {
    id: "sell",
    image: "/banners/sell.svg",
    alt: "Откройте магазин на учебном маркетплейсе",
    href: "/sell",
  },
];

/**
 * Баннер-карусель. Картинки локальные (public/banners), поэтому слайдер
 * работает и без интернета. Автопрокрутку ставим на паузу при наведении.
 */
export default function HeroBanner({
  quickCategories = [],
}: {
  quickCategories?: Array<{
    name: string;
    slug: string;
    emoji: string;
    color?: string;
  }>;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (direction: number) =>
      setIndex((prev) => (prev + direction + slides.length) % slides.length),
    [],
  );

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => go(1), 6000);
    return () => window.clearInterval(timer);
  }, [paused, go]);

  return (
    <div className="mx-auto mt-5 w-full max-w-[1240px] px-4">
      <div
        className="relative overflow-hidden rounded-3xl bg-surface"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide) => (
            <Link
              key={slide.id}
              href={slide.href}
              className="relative aspect-[8/3] w-full shrink-0 sm:aspect-[16/6]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.image}
                alt={slide.alt}
                className="h-full w-full object-cover"
              />
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Предыдущий баннер"
          className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-700 shadow-md transition-transform hover:scale-105 active:scale-95 sm:grid"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Следующий баннер"
          className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-700 shadow-md transition-transform hover:scale-105 active:scale-95 sm:grid"
        >
          <ChevronRight size={20} />
        </button>

        <div className="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Баннер ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>

      {quickCategories.length > 0 && (
        <div className="no-scrollbar mt-3.5 flex gap-2.5 overflow-x-auto pb-1">
          {quickCategories.map((item) => (
            <Link
              key={item.slug}
              href={`/catalog/${item.slug}`}
              className="flex shrink-0 items-center gap-2.5 rounded-2xl bg-surface/70 px-3.5 py-2.5 transition-colors hover:bg-brand-soft"
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-xl text-[17px]"
                style={{ background: item.color }}
                aria-hidden
              >
                {item.emoji}
              </span>
              <span className="whitespace-nowrap text-[13px] font-semibold text-ink">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
