"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, MessageSquareQuote, Send, Star, Trash2 } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ProductImage from "@/components/ui/ProductImage";
import { deleteReview, replyToReview } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { relativeTime } from "@/lib/format";
import type { Review } from "@/types/product";

type Row = Review & { product: { id: number; title: string; image: string } };

/** Отзывы о товарах магазина + ответы продавца (один ответ на отзыв). */
export default function SellerReviews({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<"all" | "without_reply" | "negative">("all");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const router = useRouter();
  const { showToast } = useCart();

  const visible = useMemo(() => {
    if (filter === "without_reply") return rows.filter((row) => !row.seller_reply);
    if (filter === "negative") return rows.filter((row) => row.rating <= 3);
    return rows;
  }, [rows, filter]);

  const send = async (review: Row) => {
    setBusy(review.id);
    try {
      await replyToReview(review.id, drafts[review.id] ?? review.seller_reply ?? "");
      setRows((prev) =>
        prev.map((row) =>
          row.id === review.id ? { ...row, seller_reply: drafts[review.id] } : row,
        ),
      );
      router.refresh();
      showToast("Ответ опубликован");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Не удалось ответить");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (review: Row) => {
    if (
      !window.confirm(
        "Удалить отзыв? В реальном маркетплейсе так делают только с отзывами не о товаре.",
      )
    )
      return;
    setBusy(review.id);
    try {
      await deleteReview(review.id);
      setRows((prev) => prev.filter((row) => row.id !== review.id));
      router.refresh();
      showToast("Отзыв удалён");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Не удалось удалить отзыв");
    } finally {
      setBusy(null);
    }
  };

  if (!initial.length) {
    return (
      <EmptyState
        icon={MessageSquareQuote}
        title="Отзывов о ваших товарах пока нет"
        text="Отзывы приходят из карточек товаров. Отвечать на них стоит в течение дня — это влияет на доверие к магазину."
        actionHref="/cabinet/products"
        actionLabel="К товарам"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "all", label: `Все (${rows.length})` },
            {
              value: "without_reply",
              label: `Без ответа (${rows.filter((r) => !r.seller_reply).length})`,
            },
            {
              value: "negative",
              label: `Критика (${rows.filter((r) => r.rating <= 3).length})`,
            },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors ${
              filter === option.value
                ? "bg-ink text-white"
                : "bg-white text-gray-600 ring-1 ring-line hover:text-brand"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {visible.map((review) => (
          <li key={review.id} className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">
                {review.initials}
              </span>
              <span className="text-[14px] font-bold text-ink">{review.author}</span>
              <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-[#B45309]">
                {review.rating}
                <Star size={13} className="fill-[#FFB800] text-[#FFB800]" />
              </span>
              <span className="text-[12px] text-muted">{relativeTime(review.created_at)}</span>
              {review.seller_reply ? (
                <span className="rounded-md bg-[#EAF7EE] px-2 py-0.5 text-[11.5px] font-bold text-green-700">
                  отвечено
                </span>
              ) : (
                <span className="rounded-md bg-[#FFF4E5] px-2 py-0.5 text-[11.5px] font-bold text-[#9A5B00]">
                  ждёт ответа
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(review)}
                disabled={busy === review.id}
                className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Удалить отзыв"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="mt-3 flex gap-3">
              <Link
                href={`/product/${review.product.id}`}
                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface"
              >
                <ProductImage src={review.product.image} alt={review.product.title} sizes="48px" />
              </Link>
              <div className="min-w-0">
                <Link
                  href={`/product/${review.product.id}`}
                  className="block truncate text-[13px] font-semibold text-gray-700 hover:text-brand"
                >
                  {review.product.title}
                </Link>
                <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-gray-700">
                  {review.text}
                </p>
                {(review.pros || review.cons) && (
                  <p className="mt-1 text-[12.5px] text-muted">
                    {review.pros && <span className="mr-3">＋ {review.pros}</span>}
                    {review.cons && <span>− {review.cons}</span>}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3">
              {review.seller_reply && !drafts[review.id] ? (
                <p className="rounded-xl border-l-2 border-brand bg-brand-soft/60 px-3 py-2 text-[13px] text-gray-700">
                  <span className="font-bold text-brand">Ваш ответ: </span>
                  {review.seller_reply}
                </p>
              ) : (
                <div className="rounded-xl bg-surface/60 p-3">
                  <textarea
                    rows={2}
                    value={drafts[review.id] ?? review.seller_reply ?? ""}
                    onChange={(event) =>
                      setDrafts((prev) => ({ ...prev, [review.id]: event.target.value }))
                    }
                    placeholder="Ответ покупателю: что исправили, как помочь, что предложить"
                    className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-[13.5px] outline-none focus:border-brand"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    {review.seller_reply && (
                      <button
                        type="button"
                        onClick={() => setDrafts((prev) => ({ ...prev, [review.id]: "" }))}
                        className="rounded-lg px-3 py-2 text-[13px] font-semibold text-muted hover:text-ink"
                      >
                        Отмена
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => send(review)}
                      disabled={busy === review.id || (drafts[review.id] ?? "").trim().length < 5}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
                    >
                      {busy === review.id ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      {review.seller_reply ? "Обновить ответ" : "Ответить"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="rounded-xl bg-surface/70 px-4 py-3 text-[13.5px] text-muted">
          В этой выборке отзывов нет.
        </p>
      )}
    </div>
  );
}
