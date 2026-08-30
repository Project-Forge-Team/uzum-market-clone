"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Check,
  Heart,
  Minus,
  Plus,
  RefreshCcw,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import Stars from "@/components/ui/Stars";
import { useCart } from "@/lib/cart";
import { formatNumber, reviewsWord } from "@/lib/format";
import type { Product } from "@/types/product";

/** Правая колонка карточки товара: цена, количество и все действия покупателя. */
export default function BuyPanel({ product }: { product: Product }) {
  const router = useRouter();
  const { add, inCart, qtyInCart, toggleFavorite, isFavorite, showToast } = useCart();
  const maxQty = Math.max(1, Math.min(20, product.stock || 1));
  const [qty, setQty] = useState(1);

  const already = inCart(product.id);
  const fav = isFavorite(product.id);

  const addToCart = () => {
    add(product, qty);
  };

  const buyNow = () => {
    add(product, qty);
    router.push("/cart");
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Ссылка на товар скопирована");
    } catch {
      showToast("Браузер не дал доступ к буферу обмена");
    }
  };

  return (
    <div className="flex flex-col">
      <h1 className="text-[22px] font-semibold leading-snug text-ink md:text-[26px]">
        {product.title}
      </h1>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <Stars value={product.rating} reviews={product.reviews_count} />
        <Link href="#reviews" className="text-[13px] font-medium text-brand hover:underline">
          {reviewsWord(product.reviews_count)}
        </Link>
        <span className="text-[13px] text-muted">
          Артикул {String(product.id).padStart(6, "0")}
        </span>
        {product.brand && (
          <span className="text-[13px] text-muted">Бренд: {product.brand}</span>
        )}
      </div>

      <div className="mt-5 rounded-2xl bg-surface/60 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-[30px] font-extrabold leading-none text-ink">
            {formatNumber(product.price)}
            <span className="ml-1 text-[15px] font-bold text-muted">сум</span>
          </span>
          {product.old_price && (
            <>
              <span className="text-[16px] text-gray-400 line-through">
                {formatNumber(product.old_price)}
              </span>
              <span className="rounded-lg bg-[#FFEAEA] px-2 py-1 text-[12px] font-bold text-[#E02B2B]">
                −{product.discount_percent}%
              </span>
            </>
          )}
        </div>

        {product.monthly_payment && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5">
            <ShieldCheck size={17} className="text-brand" />
            <p className="text-[13px] leading-snug text-gray-700">
              Рассрочка 0% на {product.monthly_payment.months} месяцев — по{" "}
              <span className="font-bold text-brand">
                {formatNumber(product.monthly_payment.per_month)} сум
              </span>{" "}
              в месяц
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-white ring-1 ring-line">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid h-11 w-11 place-items-center rounded-l-xl text-gray-500 transition-colors hover:text-brand disabled:opacity-40"
              disabled={qty <= 1}
              aria-label="Уменьшить количество"
            >
              <Minus size={16} />
            </button>
            <span className="w-10 text-center text-[15px] font-bold text-ink">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              className="grid h-11 w-11 place-items-center rounded-r-xl text-gray-500 transition-colors hover:text-brand disabled:opacity-40"
              disabled={qty >= maxQty}
              aria-label="Увеличить количество"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={already ? () => router.push("/cart") : addToCart}
            disabled={!product.in_stock}
            className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-[14px] font-bold transition-colors ${
              already
                ? "bg-accent text-ink hover:bg-accent-dark"
                : "bg-brand text-white hover:bg-brand-dark disabled:bg-surface disabled:text-muted"
            }`}
          >
            {already ? (
              <>
                <Check size={17} /> В корзине: {qtyInCart(product.id)}
              </>
            ) : (
              <>
                <ShoppingCart size={17} />
                {product.in_stock ? "В корзину" : "Нет в наличии"}
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={buyNow}
          disabled={!product.in_stock}
          className="mt-2 h-11 w-full rounded-xl text-[14px] font-bold text-brand ring-1 ring-brand transition-colors hover:bg-brand-soft disabled:opacity-40"
        >
          Купить сейчас
        </button>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleFavorite(product)}
            className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              fav
                ? "bg-white text-brand ring-1 ring-brand-border"
                : "bg-white text-gray-600 ring-1 ring-line hover:text-brand"
            }`}
          >
            <Heart size={15} className={fav ? "fill-brand" : ""} />
            {fav ? "В избранном" : "В избранное"}
          </button>
          <button
            type="button"
            onClick={share}
            className="grid h-9 w-9 place-items-center rounded-lg bg-white text-gray-600 ring-1 ring-line transition-colors hover:text-brand"
            aria-label="Поделиться ссылкой"
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 text-[13px]">
        <InfoRow icon={<Truck size={16} />} title="Доставка" text={product.delivery_time} />
        <InfoRow
          icon={<RefreshCcw size={16} />}
          title="Возврат"
          text="14 дней, если товар не был в использовании"
        />
        <InfoRow
          icon={<Banknote size={16} />}
          title="Оплата"
          text="Картой при получении, Uzcard / Humo / Payme"
        />
      </div>

      {product.in_stock ? (
        <p className="mt-4 text-[13px] font-medium text-green-600">
          В наличии: {product.stock} шт. у продавца
        </p>
      ) : (
        <p className="mt-4 rounded-lg bg-[#FFF4E5] px-3 py-2 text-[13px] font-medium text-[#9A5B00]">
          Продавец пока не завёз товар — добавьте в избранное, чтобы не потерять.
        </p>
      )}

      <p className="mt-3 text-[12px] leading-relaxed text-gray-400">
        Учебный демо-магазин: заказы оформляются без списания денег, платежи не
        проводятся.
      </p>

      <Link
        href={`/shop/${product.seller?.slug ?? product.seller?.id}`}
        className="mt-4 rounded-xl px-4 py-3 text-center text-[13px] font-semibold text-brand ring-1 ring-brand-border transition-colors hover:bg-brand-soft md:hidden"
      >
        Перейти в магазин продавца
      </Link>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 ring-1 ring-line">
      <span className="mt-0.5 text-gray-500">{icon}</span>
      <p className="leading-snug">
        <span className="font-semibold text-ink">{title}: </span>
        <span className="text-muted">{text}</span>
      </p>
    </div>
  );
}
