"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    id: "school",
    gradient: "from-[#EDE7FF] to-[#C9B8FF]",
    accent: "#7000FF",
    badge: "Школьный базар",
    badgeColor: "bg-[#7000FF]/10 text-[#7000FF]",
    emoji: "🎒",
    title: "Собираем ребёнка в школу без переплат",
    subtitle: "Скидки до 40% на тетради, рюкзаки и канцелярию",
    btnText: "Смотреть «Книги и канцелярия»",
    href: "/catalog/knigi",
  },
  {
    id: "tech",
    gradient: "from-[#E9F6FF] to-[#C4E3FF]",
    accent: "#0B63C5",
    badge: "Рассрочка 0%",
    badgeColor: "bg-[#0B63C5]/10 text-[#0B63C5]",
    emoji: "🎧",
    title: "Техника в рассрочку",
    subtitle: "Без переплаты и справок — первый платёж через месяц",
    btnText: "Выбрать электронику",
    href: "/catalog/elektronika",
  },
  {
    id: "sell",
    gradient: "from-[#F4FFE2] to-[#D6F5A3]",
    accent: "#4E7A00",
    badge: "Кабинет продавца",
    badgeColor: "bg-[#4E7A00]/10 text-[#4E7A00]",
    emoji: "🏪",
    title: "Откройте магазин за 5 минут",
    subtitle: "Публикуйте товары, отвечайте на отзывы и отслеживайте заказы",
    btnText: "Стать продавцом",
    href: "/sell",
  },
];

/**
 * Баннер-карусель на чистом CSS — без SVG.
 * Градиенты, декоративные круги и эмодзи. Легко менять цвета и текст.
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
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide) => (
            <Link
              key={slide.id}
              href={slide.href}
              className={`relative aspect-[8/3] w-full shrink-0 bg-gradient-to-br ${slide.gradient} sm:aspect-[16/6]`}
            >
              {/* Декоративные круги */}
              <div className="pointer-events-none absolute right-[8%] top-[20%] h-[280px] w-[280px] rounded-full bg-white/50 sm:h-[380px] sm:w-[380px]" />
              <div
                className="pointer-events-none absolute right-[18%] top-[30%] h-[180px] w-[180px] rounded-full opacity-15"
                style={{ backgroundColor: slide.accent }}
              />

              {/* Контент слева */}
              <div className="absolute left-6 top-[18%] flex flex-col gap-3 sm:left-12 sm:top-[22%] sm:gap-4">
                <span
                  className={`inline-block w-fit rounded-full px-4 py-1.5 text-xs font-bold ${slide.badgeColor}`}
                >
                  {slide.badge}
                </span>
                <h2 className="max-w-md text-xl font-extrabold leading-tight text-ink sm:text-3xl md:text-4xl">
                  {slide.title}
                </h2>
                <p className="max-w-sm text-sm text-gray-600 sm:text-base">
                  {slide.subtitle}
                </p>
                <span
                  className="mt-1 inline-block rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-105 sm:py-4 sm:text-base"
                  style={{ backgroundColor: slide.accent }}
                >
                  {slide.btnText}
                </span>
              </div>

              {/* Эмодзи справа */}
              <div className="pointer-events-none absolute right-8 top-[15%] text-[100px] leading-none sm:right-20 sm:top-[18%] sm:text-[140px] md:right-28 md:text-[180px]">
                {slide.emoji}
              </div>
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
                i === index
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/60 hover:bg-white/80"
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
