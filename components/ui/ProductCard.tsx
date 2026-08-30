"use client";

import Link from "next/link";
import { Heart, ShoppingCart, Truck, Check } from "lucide-react";
import ProductImage from "@/components/ui/ProductImage";
import Stars from "@/components/ui/Stars";
import { useCart } from "@/lib/cart";
import { formatNumber } from "@/lib/format";
import type { Product } from "@/types/product";

/**
 * Карточка товара для витрины.
 * Клик по всей карточке ведёт в товар (ссылка-оверлей), кнопки корзины и
 * избранного лежат выше оверлея и работают сами по себе.
 */
export default function ProductCard({
  product,
  showDelivery = true,
}: {
  product: Product;
  showDelivery?: boolean;
}) {
  const { add, inCart, qtyInCart, toggleFavorite, isFavorite } = useCart();
  const fav = isFavorite(product.id);
  const inCartNow = inCart(product.id);
  const discount = product.discount_percent;
  const installment = product.monthly_payment;

  return (
    <div className="group relative flex h-full flex-col rounded-2xl bg-white p-3 ring-1 ring-transparent transition-all hover:ring-line hover:shadow-[0_10px_30px_-18px_rgba(31,31,31,0.4)]">
      <Link
        href={`/product/${product.id}`}
        className="absolute inset-0 z-[1] rounded-2xl"
        aria-label={product.title}
      />

      <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-surface/60">
        <ProductImage
          src={product.image}
          alt={product.title}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-lg bg-brand/95 px-2 py-1 text-[11px] font-bold text-white">
            −{discount}%
          </span>
        )}
        {product.is_ad && (
          <span className="absolute bottom-2 left-2 rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-medium text-muted backdrop-blur-sm">
            реклама
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleFavorite(product)}
          aria-label={fav ? "Убрать из избранного" : "В избранное"}
          aria-pressed={fav}
          className="absolute right-2 top-2 z-[2] grid h-8 w-8 place-items-center rounded-full bg-white/90 text-gray-500 shadow-sm backdrop-blur transition-colors hover:text-brand"
        >
          <Heart size={16} className={fav ? "fill-brand text-brand" : ""} />
        </button>
      </div>

      <div className="mt-auto flex flex-col">
        <div className="flex flex-wrap items-end gap-x-2">
          <span className="text-[19px] font-bold leading-tight text-ink">
            {formatNumber(product.price)}
            <span className="ml-1 text-[13px] font-semibold text-muted">сум</span>
          </span>
          {product.old_price && (
            <span className="text-[13px] text-gray-400 line-through">
              {formatNumber(product.old_price)}
            </span>
          )}
        </div>

        {installment && (
          <span className="mt-1 w-fit rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand">
            {formatNumber(installment.per_month)} сум × {installment.months} мес
          </span>
        )}

        {product.reviews_count > 0 && (
          <div className="mt-1.5">
            <Stars value={product.rating} reviews={product.reviews_count} showValue={false} />
          </div>
        )}

        <h3 className="mt-1.5 line-clamp-2 min-h-[36px] text-[13px] leading-snug text-gray-700">
          {product.title}
        </h3>

        {showDelivery && (
          <div className="mt-1 flex items-center gap-1 text-[12px] text-muted">
            <Truck size={13} className="text-gray-400" />
            {product.delivery_time}
            {!product.in_stock && (
              <span className="ml-auto text-[11px] text-gray-400">нет в наличии</span>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={!product.in_stock}
          onClick={() => (inCartNow ? undefined : add(product, 1))}
          className={`mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
            inCartNow
              ? "bg-accent text-ink hover:bg-accent-dark"
              : "bg-brand text-white hover:bg-brand-dark disabled:bg-surface disabled:text-muted"
          }`}
        >
          {inCartNow ? (
            <>
              <Check size={15} />В корзине: {qtyInCart(product.id)}
            </>
          ) : (
            <>
              <ShoppingCart size={15} />В корзину
            </>
          )}
        </button>
      </div>
    </div>
  );
}
