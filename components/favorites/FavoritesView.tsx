"use client";

import Link from "next/link";
import { Heart, LoaderCircle, Trash2 } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ProductCard from "@/components/ui/ProductCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { useFavoritesTotals } from "@/lib/use-live-cart";
import { useCart } from "@/lib/cart";

/** Избранное: те же карточки, что в каталоге, плюс быстрый перенос в корзину. */
export default function FavoritesView() {
  const { favorites, ready, remove } = useCart();
  const { live, loading } = useFavoritesTotals();

  if (!ready || (loading && live.length === 0)) {
    return (
      <div className="mx-auto flex max-w-[1240px] items-center justify-center gap-2 px-4 py-24 text-muted">
        <LoaderCircle className="animate-spin" size={18} /> Загружаем избранное…
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <div className="px-4 py-16">
        <EmptyState
          icon={Heart}
          title="В избранном пусто"
          text="Нажмите на сердечко в карточке товара — он сохранится здесь и переживёт перезагрузку страницы."
          actionHref="/catalog"
          actionLabel="Найти товары"
        />
      </div>
    );
  }

  const byId = new Map(live.map((line) => [line.id, line]));

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6">
      <SectionHeader
        title="Избранное"
        subtitle={`${favorites.length} товар(ов) · цены и наличие обновлены`}
        href="/catalog"
        linkLabel="К каталогу"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {favorites.map((line) => {
          const fresh = byId.get(line.id);
          const product = fresh?.product;

          if (!product) {
            return (
              <div
                key={line.id}
                className="flex h-full flex-col rounded-2xl bg-white p-3 ring-1 ring-line"
              >
                <div className="mb-2 aspect-square overflow-hidden rounded-xl bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={line.image} alt={line.title} className="h-full w-full object-contain" />
                </div>
                <p className="line-clamp-2 text-[13px] font-medium text-gray-600">
                  {line.title}
                </p>
                <p className="mt-1.5 rounded-lg bg-[#FFEAEA] px-2 py-1 text-[12px] font-semibold text-[#B42318]">
                  Товар снят с продажи
                </p>
                <button
                  type="button"
                  onClick={() => remove(line.id)}
                  className="mt-auto flex h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold text-red-600 ring-1 ring-red-100 transition-colors hover:bg-red-50"
                >
                  <Trash2 size={14} /> Убрать
                </button>
              </div>
            );
          }

          return (
            <div key={line.id} className="relative">
              <ProductCard product={product} />
              <button
                type="button"
                onClick={() => remove(line.id)}
                className="absolute right-11 top-2 z-[3] grid h-8 w-8 place-items-center rounded-full bg-white/90 text-gray-500 shadow-sm transition-colors hover:text-red-600"
                aria-label="Убрать из избранного"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl bg-brand-soft p-5">
        <p className="text-[14px] font-medium text-ink">
          Нравится товар, но с покупкой рано? Продавец может сделать цену ниже — мы
          покажем изменения здесь же, при следующем заходе.
        </p>
        <Link
          href="/cart"
          className="ml-auto rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-brand ring-1 ring-brand-border transition-colors hover:bg-white/70"
        >
          Перейти в корзину
        </Link>
      </div>
    </div>
  );
}
