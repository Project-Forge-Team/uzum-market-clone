"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Package, Truck } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ProductImage from "@/components/ui/ProductImage";
import { updateOrderStatus } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatDate, formatNumber } from "@/lib/format";
import { ORDER_STATUS_LABELS, type ShopOrder } from "@/types/product";

const NEXT_LABEL: Record<ShopOrder["status"], string | null> = {
  new: "Собираем заказ",
  packing: "Передать курьеру",
  shipping: "Отметить доставленным",
  delivered: null,
  cancelled: null,
};

/** Заказы, в которых есть товары магазина: продавец ведёт их по статусам. */
export default function SellerOrders({ initial }: { initial: ShopOrder[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const router = useRouter();
  const { showToast } = useCart();

  const advance = async (order: ShopOrder) => {
    setBusy(order.id);
    try {
      const result = await updateOrderStatus(order.id, "advance");
      setRows((prev) =>
        prev.map((row) =>
          row.id === order.id
            ? { ...row, status: result.status as ShopOrder["status"] }
            : row,
        ),
      );
      router.refresh();
      showToast(`Заказ ${order.number}: ${ORDER_STATUS_LABELS[result.status as ShopOrder["status"]]}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Не удалось обновить статус");
    } finally {
      setBusy(null);
    }
  };

  if (!initial.length) {
    return (
      <EmptyState
        icon={Package}
        title="Заказов на товары магазина пока нет"
        text="Как только покупатель оформит корзину с вашим товаром, здесь появится заказ с составом, адресом и кнопками смены статуса."
        actionHref="/cabinet/products"
        actionLabel="Проверить товары"
      />
    );
  }

  return (
    <ul className="space-y-4">
      {rows.map((order) => (
        <li key={order.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div>
              <p className="text-[15px] font-bold text-ink">Заказ {order.number}</p>
              <p className="text-[12.5px] text-muted">
                {formatDate(order.created_at)} · {order.buyer_name}
              </p>
            </div>
            <span className="rounded-lg bg-brand-soft px-2.5 py-1 text-[12px] font-bold text-brand">
              {ORDER_STATUS_LABELS[order.status]}
            </span>
            <p className="ml-auto text-[15px] font-extrabold text-ink">
              {formatNumber(order.total)} сум
            </p>
          </header>

          <ul className="mt-3.5 space-y-2">
            {order.items.map((item) => (
              <li key={item.product_id} className="flex items-center gap-3">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                  <ProductImage src={item.image} alt={item.title} sizes="40px" />
                </span>
                <span className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.product_id}`}
                    className="block truncate text-[13.5px] font-semibold text-ink hover:text-brand"
                  >
                    {item.title}
                  </Link>
                  <span className="block text-[12px] text-muted">
                    {item.qty} × {formatNumber(item.price)} сум
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3.5 flex flex-wrap items-center gap-2 rounded-xl bg-surface/60 px-3.5 py-2.5 text-[12.5px] text-gray-700">
            <Truck size={14} className="text-gray-400" />
            {order.delivery_method === "pickup"
              ? `Самовывоз · ${order.pickup_point}`
              : `Курьер · ${order.address}`}
            {order.payment_method === "installment" && (
              <span className="ml-auto rounded-md bg-white px-2 py-0.5 font-semibold text-brand">
                рассрочка
              </span>
            )}
            {order.payment_method === "cash" && (
              <span className="ml-auto rounded-md bg-white px-2 py-0.5 font-semibold text-brand">
                наличные
              </span>
            )}
          </div>

          <footer className="mt-3.5 flex flex-wrap gap-2">
            {NEXT_LABEL[order.status] && (
              <button
                type="button"
                onClick={() => advance(order)}
                disabled={busy === order.id}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
              >
                {NEXT_LABEL[order.status]}
                <ArrowRight size={14} />
              </button>
            )}
            <Link
              href={`/profile/orders/${order.id}`}
              className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-gray-700 ring-1 ring-line transition-colors hover:text-brand hover:ring-brand-border"
            >
              Открыть как покупатель
            </Link>
          </footer>
        </li>
      ))}
    </ul>
  );
}
