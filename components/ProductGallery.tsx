"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import ProductImage from "@/components/ui/ProductImage";
import { PLACEHOLDER } from "@/components/ui/ProductImage";

/**
 * Галерея товара: превью-лента, стрелки, зум по клику.
 * Картинки — локальные svg/png, поэтому галерея не зависит от внешних хостингов.
 */
export default function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [requested, setRequested] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  // Фото могли смениться (редактирование товара) — индекс просто зажимается в
  // диапазон, отдельный эффект для этого не нужен.
  const index = requested < images.length ? requested : 0;

  const step = (direction: number) =>
    setRequested((prev) => {
      const base = prev < images.length ? prev : 0;
      return (base + direction + images.length) % images.length;
    });

  const current = images[index] ?? PLACEHOLDER;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="group relative aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-line"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPointer({
            x: ((event.clientX - rect.left) / rect.width) * 100,
            y: ((event.clientY - rect.top) / rect.height) * 100,
          });
        }}
      >
        <div
          className="relative h-full w-full transition-transform duration-200"
          style={{
            transform: zoomed ? "scale(1.9)" : "scale(1)",
            transformOrigin: `${pointer.x}% ${pointer.y}%`,
          }}
        >
          <ProductImage
            src={current}
            alt={title}
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Предыдущее фото"
              className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-600 opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Следующее фото"
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-gray-600 opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setZoomed((v) => !v)}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-gray-600 shadow-sm transition-colors hover:text-brand"
          aria-label={zoomed ? "Уменьшить" : "Приблизить"}
        >
          {zoomed ? <X size={16} /> : <Expand size={16} />}
        </button>

        {images.length > 1 && (
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-2.5 py-1 text-[12px] font-semibold text-gray-600">
            {index + 1} / {images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => setRequested(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white p-1 transition-all ${
                i === index
                  ? "ring-2 ring-brand"
                  : "ring-1 ring-line hover:ring-brand-border"
              }`}
              aria-label={`Фото ${i + 1}`}
            >
              <ProductImage src={img} alt={`${title} — фото ${i + 1}`} sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
