"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquareQuote, Star, Trash2 } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ProductImage from "@/components/ui/ProductImage";
import { deleteReview } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatDate } from "@/lib/format";
import type { Review } from "@/types/product";

type Row = Review & { product: { id: number; title: string; image: string } };

/** Список отзывов пользователя: можно обновить в карточке или удалить. */
export default function MyReviews({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const router = useRouter();
  const { showToast } = useCart();

  const remove = async (id: number) => {
    if (!window.confirm("Удалить этот отзыв?")) return;
    setBusy(id);
    try {
      await deleteReview(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      router.refresh();
      showToast("Отзыв удалён");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Не удалось удалить отзыв");
    } finally {
      setBusy(null);
    }
  };

  if (!rows.length) {
    return (
      <EmptyState
        icon={MessageSquareQuote}
        title="Отзывов пока нет"
        text="После заказа и получения товара оставьте отзыв в карточке — это помогает другим покупателям и продавец видит, что исправить."
        actionHref="/catalog"
        actionLabel="Найти товары"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.id} className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <div className="flex gap-3">
            <Link
              href={`/product/${row.product.id}`}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface"
            >
              <ProductImage src={row.product.image} alt={row.product.title} sizes="56px" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/product/${row.product.id}`}
                className="block truncate text-[14px] font-semibold text-ink hover:text-brand"
              >
                {row.product.title}
              </Link>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                <span className="inline-flex items-center gap-0.5 font-semibold text-[#B45309]">
                  {row.rating}
                  <Star size={12} className="fill-[#FFB800] text-[#FFB800]" />
                </span>
                · {formatDate(row.created_at)}
                {row.verified && (
                  <span className="rounded bg-[#EAF7EE] px-1.5 py-0.5 text-[11px] font-semibold text-green-700">
                    заказ подтверждён
                  </span>
                )}
              </p>
              <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-gray-700">
                {row.text}
              </p>
              {row.seller_reply && (
                <p className="mt-2 rounded-lg border-l-2 border-brand bg-brand-soft/60 px-3 py-2 text-[12.5px] text-gray-700">
                  <span className="font-semibold text-brand">Ответ продавца: </span>
                  {row.seller_reply}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Link
                href={`/product/${row.product.id}#reviews`}
                className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-brand ring-1 ring-brand-border transition-colors hover:bg-brand-soft"
              >
                Изменить
              </Link>
              <button
                type="button"
                onClick={() => remove(row.id)}
                disabled={busy === row.id}
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Удалить отзыв"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
