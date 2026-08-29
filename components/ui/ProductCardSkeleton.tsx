import React from "react";

interface ProductCardSkeletonProps {
  count?: number;
}

export function ProductCardSkeleton({ count = 1 }: ProductCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col bg-white rounded-xl p-3 h-full animate-pulse"
        >
          {/* Блок изображения */}
          <div
            className="relative aspect-square mb-2 rounded-lg bg-gray-200 overflow-hidden"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            {/* Имитация кнопки избранного */}
            <div className="absolute top-1 left-1 w-7 h-7 rounded-full bg-white/60 backdrop-blur-sm" />
            {/* Имитация плашки "Реклама" */}
            <div className="absolute top-1 right-1 w-14 h-4 rounded bg-gray-300/70" />
            {/* Мягкий шиммер поверх */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          </div>

          {/* Контент */}
          <div className="mt-auto space-y-2">
            {/* Цена */}
            <div
              className="h-6 w-3/4 rounded-md bg-gray-200"
              style={{ animationDelay: "0.1s" }}
            />
            {/* Старая цена */}
            <div
              className="h-3 w-1/3 rounded bg-gray-200"
              style={{ animationDelay: "0.15s" }}
            />

            {/* Рассрочка */}
            <div
              className="h-5 w-3/5 rounded bg-[#F0F0FF]/70 mt-1"
              style={{ animationDelay: "0.2s" }}
            />

            {/* Рейтинг */}
            <div
              className="flex items-center gap-1 mt-2"
              style={{ animationDelay: "0.25s" }}
            >
              <div className="w-3 h-3 rounded-full bg-yellow-200" />
              <div className="h-3 w-12 rounded bg-gray-200" />
              <div className="h-3 w-16 rounded bg-gray-200" />
            </div>

            {/* Заголовок (2 строки) */}
            <div
              className="space-y-1.5 mt-1 min-h-[40px]"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="h-3 w-full rounded bg-gray-200" />
              <div className="h-3 w-5/6 rounded bg-gray-200" />
            </div>
          </div>

          {/* Кнопка "Купить" */}
          <button
            className="w-full mt-3 py-2 rounded-lg bg-[#7000FF]/15 text-transparent"
            disabled
          >
            <div className="h-4 w-2/3 mx-auto rounded bg-[#7000FF]/20" />
          </button>
        </div>
      ))}
    </>
  );
}

export default ProductCardSkeleton;
