"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import ProductImage from "@/components/ui/ProductImage";
import { updateOrderStatus } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatDate, formatNumber } from "@/lib/format";
import { ORDER_STATUS_LABELS, type ShopOrder } from "@/types/product";

const STATUS_STYLE: Record<ShopOrder["status"], string> = {
  new: "bg-[#FFF4E5] text-[#9A5B00]",
  packing: "bg-brand-soft text-brand",
  shipping: "bg-[#E7F1FF] text-[#0B63C5]",
  delivered: "bg-[#EAF7EE] text-green-700",
  cancelled: "bg-[#FFEAEA] text-[#B42318]",
};

const STATUS_PROGRESS: Record<ShopOrder["status"], number> = {
  new: 1,
  packing: 2,
  shipping: 3,
  delivered: 4,
  cancelled: 0,
};

const STEPS = ["Собран", "Упакован", "В пути", "Доставлен"];

/** Карточка заказа: статус, прогресс, состав и действия (отмена/повтор). */
export default function OrderCard({
  order,
  detailed = false,
}: {
  order: ShopOrder;
  detailed?: boolean;
}) {
  const router = useRouter();
  const { add, showToast } = useCart();
  const [busy, setBusy] = useState(false);
  const progress = STATUS_PROGRESS[order.status];

  const cancel = async () => {
    if (!window.confirm(`Отменить заказ ${order.number}? Товары вернутся в наличии.`)) return;
    setBusy(true);
    try {
      await updateOrderStatus(order.id, "cancel");
      router.refresh();
      showToast("Заказ отменён");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Не удалось отменить заказ");
    } finally {
      setBusy(false);
    }
  };

  const repeat = () => {
    let added = 0;
    for (const item of order.items) {
      add(
        {
          id: item.product_id,
          title: item.title,
          image: item.image,
          price: item.price,
          seller_id: item.seller_id,
          seller_name: item.seller_name,
        },
        item.qty,
      );
      added += 1;
    }
    if (added) router.push("/cart");
  };

  return (
    <article className="rounded-2xl bg-white p-4 ring-1 ring-line md:p-5">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <p className="text-[15px] font-bold text-ink">Заказ {order.number}</p>
          <p className="text-[12.5px] text-muted">от {formatDate(order.created_at)}</p>
        </div>
        <span
          className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${STATUS_STYLE[order.status]}`}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
        <span className="ml-auto text-right">
          <span className="block text-[16px] font-extrabold text-ink">
            {formatNumber(order.total)} сум
          </span>
          <span className="block text-[12px] text-muted">
            {order.items_count} шт. ·{" "}
            {order.payment_method === "cash"
              ? "наличные"
              : order.payment_method === "installment"
                ? "рассрочка"
                : "карта"}
          </span>
        </span>
      </header>

      {order.status !== "cancelled" && (
        <ol className="mt-4 hidden items-center gap-1 sm:flex">
          {STEPS.map((step, index) => {
            const done = index + 1 <= progress;
            return (
              <li key={step} className="flex flex-1 items-center gap-1">
                <span
                  className={`h-1.5 flex-1 rounded-full ${done ? "bg-brand" : "bg-line"}`}
                />
                <span
                  className={`whitespace-nowrap text-[11.5px] font-semibold ${
                    done ? "text-brand" : "text-gray-400"
                  }`}
                >
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <ul className="mt-4 space-y-2.5">
        {order.items.map((item) => (
          <li key={item.product_id} className="flex items-center gap-3">
            <Link
              href={`/product/${item.product_id}`}
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface"
            >
              <ProductImage src={item.image} alt={item.title} sizes="48px" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/product/${item.product_id}`}
                className="block truncate text-[13.5px] font-medium text-ink hover:text-brand"
              >
                {item.title}
              </Link>
              <p className="text-[12px] text-muted">
                {item.seller_name} · {item.qty} × {formatNumber(item.price)} сум
              </p>
            </div>
            <span className="text-[13.5px] font-bold text-ink">
              {formatNumber(item.price * item.qty)}
            </span>
          </li>
        ))}
      </ul>

      {detailed && (
        <div className="mt-4 grid gap-2 rounded-xl bg-surface/60 p-3.5 text-[12.5px] text-gray-700 sm:grid-cols-2">
          <p className="flex items-start gap-2">
            <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
            <span>
              {order.delivery_method === "pickup" ? "Самовывоз: " : "Адрес: "}
              {order.address}
              {order.pickup_point && ` · ${order.pickup_point}`}
            </span>
          </p>
          <p className="flex items-start gap-2">
            <Truck size={14} className="mt-0.5 shrink-0 text-gray-400" />
            <span>
              {order.delivery_method === "pickup" ? "Пункт выдачи" : "Курьер"} ·{" "}
              {order.delivery_cost ? `${formatNumber(order.delivery_cost)} сум` : "бесплатно"}
            </span>
          </p>
          <p className="flex items-start gap-2">
            {order.payment_method === "cash" ? (
              <Banknote size={14} className="mt-0.5 shrink-0 text-gray-400" />
            ) : order.payment_method === "installment" ? (
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-gray-400" />
            ) : (
              <CreditCard size={14} className="mt-0.5 shrink-0 text-gray-400" />
            )}
            <span>
              {order.payment_method === "card"
                ? "Оплата картой при получении"
                : order.payment_method === "cash"
                  ? "Наличными курьеру"
                  : `Рассрочка: ${formatNumber(Math.ceil(order.total / 12))} сум × 12 мес`}
            </span>
          </p>
          {order.promo_code && (
            <p className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-600" />
              <span>
                Промокод {order.promo_code}: −{formatNumber(order.discount)} сум
              </span>
            </p>
          )}
          {order.comment && (
            <p className="sm:col-span-2">
              <span className="font-semibold">Комментарий:</span> {order.comment}
            </p>
          )}
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/profile/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-soft px-3.5 py-2 text-[13px] font-bold text-brand transition-colors hover:bg-brand-border"
        >
          Подробнее об заказе <ArrowRight size={14} />
        </Link>
        <button
          type="button"
          onClick={repeat}
          className="rounded-lg px-3.5 py-2 text-[13px] font-semibold text-gray-700 ring-1 ring-line transition-colors hover:text-brand hover:ring-brand-border"
        >
          Повторить заказ
        </button>
        {!["delivered", "cancelled"].includes(order.status) && (
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <XCircle size={14} />}
            Отменить
          </button>
        )}
      </footer>
    </article>
  );
}
