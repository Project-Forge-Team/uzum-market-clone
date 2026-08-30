"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Heart,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ProductImage from "@/components/ui/ProductImage";
import {
  COURIER_COST,
  FREE_DELIVERY_FROM,
  useCartTotals,
} from "@/lib/use-live-cart";
import { useCart } from "@/lib/cart";
import { formatNumber } from "@/lib/format";
import type { LiveLine } from "@/lib/use-live-cart";

/** Корзина: цены и остатки сверяются с API, суммы считаются по правилам бэкенда. */
export default function CartView() {
  const { items, setQty, remove, toggleFavorite, isFavorite, clear, ready } = useCart();
  const { live, available, loading, subtotal, savings, error } = useCartTotals();

  if (!ready || (loading && items.length > 0 && live.length === 0)) {
    return (
      <div className="mx-auto flex max-w-[1240px] items-center justify-center gap-2 px-4 py-24 text-muted">
        <LoaderCircle className="animate-spin" size={18} /> Считаем корзину…
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="px-4 py-16">
        <EmptyState
          icon={ShoppingCart}
          title="В корзине пока пусто"
          text="Добавляйте товары из каталога — здесь они сохранятся, даже если вы закроете вкладку."
          actionHref="/catalog"
          actionLabel="Перейти в каталог"
          secondaryHref="/search?discounted=1"
          secondaryLabel="Посмотреть товары со скидкой"
        />
      </div>
    );
  }

  const groups = new Map<string, LiveLine[]>();
  for (const line of live) {
    const key = line.product?.seller?.name ?? "Другие продавцы";
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }

  const delivery = subtotal >= FREE_DELIVERY_FROM ? 0 : COURIER_COST;
  const total = subtotal + delivery;
  const units = available.reduce((acc, line) => acc + line.qty, 0);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">
          Корзина{" "}
          <span className="text-[15px] font-medium text-muted">
            {units} шт. в {available.length} позиц.
          </span>
        </h1>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Очистить корзину?")) clear();
          }}
          className="text-[13px] font-semibold text-muted transition-colors hover:text-red-600"
        >
          Очистить корзину
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-[#FFF4E5] px-4 py-2.5 text-[13px] font-medium text-[#9A5B00]">
          {error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_336px]">
        <div className="space-y-4">
          {Array.from(groups.entries()).map(([sellerName, lines]) => (
            <section
              key={sellerName}
              className="overflow-hidden rounded-2xl bg-white ring-1 ring-line"
            >
              <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                <Link
                  href={`/shop/${lines[0]?.product?.seller?.slug ?? ""}`}
                  className="flex items-center gap-2 text-[13.5px] font-bold text-ink transition-colors hover:text-brand"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-[11px] font-bold text-brand">
                    {sellerName.slice(0, 2).toUpperCase()}
                  </span>
                  {sellerName}
                </Link>
                <span className="text-[12px] text-muted">
                  доставка: {lines[0]?.product?.delivery_time ?? "уточняется"}
                </span>
              </header>

              <ul className="divide-y divide-line">
                {lines.map((line) => (
                  <li key={line.id} className="flex gap-3 p-4">
                    <Link
                      href={line.product ? `/product/${line.id}` : "#"}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface"
                    >
                      <ProductImage src={line.image} alt={line.title} sizes="80px" />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={line.product ? `/product/${line.id}` : "#"}
                        className="line-clamp-2 text-[14px] font-medium text-ink transition-colors hover:text-brand"
                      >
                        {line.title}
                      </Link>

                      {line.missing ? (
                        <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-[#FFEAEA] px-2 py-1 text-[12px] font-semibold text-[#B42318]">
                          <AlertTriangle size={13} /> товара больше нет в продаже
                        </p>
                      ) : line.unavailable ? (
                        <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-[#FFF4E5] px-2 py-1 text-[12px] font-semibold text-[#9A5B00]">
                          <AlertTriangle size={13} /> нет в наличии ({line.product?.stock} шт.)
                        </p>
                      ) : (
                        <div className="mt-2 flex items-center gap-2">
                          <Stepper
                            qty={line.qty}
                            max={Math.min(20, Math.max(1, line.product?.stock ?? 20))}
                            onChange={(next) => setQty(line.id, next)}
                          />
                          <span className="text-[12px] text-muted">
                            по {formatNumber(line.price)} сум
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex w-[104px] shrink-0 flex-col items-end gap-2">
                      <span className="text-[15px] font-bold text-ink">
                        {formatNumber(line.price * line.qty)}
                      </span>
                      {line.old_price && line.old_price > line.price && (
                        <span className="text-[12px] text-gray-400 line-through">
                          {formatNumber(line.old_price * line.qty)}
                        </span>
                      )}
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!line.product) return;
                            if (!isFavorite(line.id)) toggleFavorite(line.product);
                            remove(line.id);
                          }}
                          disabled={!line.product}
                          title="Переместить в избранное"
                          className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-brand-soft hover:text-brand disabled:opacity-40"
                        >
                          <Heart
                            size={15}
                            className={
                              line.product && isFavorite(line.id) ? "fill-brand text-brand" : ""
                            }
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(line.id)}
                          title="Убрать из корзины"
                          className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand hover:underline"
          >
            Продолжить покупки <ArrowRight size={15} />
          </Link>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <h2 className="text-[15px] font-bold text-ink">Итого</h2>
            <dl className="mt-3 space-y-2 text-[13.5px]">
              <Row label={`Товары (${units} шт.)`} value={`${formatNumber(subtotal)} сум`} />
              {savings > 0 && (
                <Row
                  label="Ваша выгода"
                  value={`−${formatNumber(savings)} сум`}
                  tone="success"
                />
              )}
              <Row
                label="Доставка"
                value={delivery === 0 ? "бесплатно" : `${formatNumber(delivery)} сум`}
                tone={delivery === 0 ? "success" : "default"}
              />
            </dl>

            {delivery > 0 && (
              <p className="mt-3 rounded-xl bg-brand-soft px-3 py-2 text-[12.5px] leading-snug text-brand">
                <Truck size={13} className="mr-1 inline" />
                Добавьте товаров на {formatNumber(FREE_DELIVERY_FROM - subtotal)} сум —
                и доставка станет бесплатной
              </p>
            )}

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-[14px] font-semibold text-gray-700">К оплате</span>
              <span className="text-[22px] font-extrabold text-ink">
                {formatNumber(total)}
                <span className="ml-1 text-[13px] font-bold text-muted">сум</span>
              </span>
            </div>

            <Link
              href="/checkout"
              className={`mt-4 flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-bold transition-colors ${
                available.length
                  ? "bg-brand text-white hover:bg-brand-dark"
                  : "pointer-events-none bg-surface text-muted"
              }`}
            >
              Оформить заказ
              <ArrowRight size={17} />
            </Link>
            <p className="mt-2.5 text-[11.5px] leading-snug text-muted">
              Оплата в демо-режиме не списывается: заказ сохранится в личном кабинете
              с реальным статусом и списанием остатков.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stepper({
  qty,
  max,
  onChange,
}: {
  qty: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center rounded-lg bg-surface">
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        className="grid h-8 w-8 place-items-center rounded-l-lg text-gray-500 transition-colors hover:text-brand"
        aria-label="Меньше"
      >
        <Minus size={14} />
      </button>
      <span className="w-8 text-center text-[13px] font-bold">{qty}</span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        disabled={qty >= max}
        className="grid h-8 w-8 place-items-center rounded-r-lg text-gray-500 transition-colors hover:text-brand disabled:opacity-40"
        aria-label="Больше"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success";
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd
        className={`font-semibold ${tone === "success" ? "text-green-600" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}
