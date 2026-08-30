"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  LoaderCircle,
  MessageSquare,
  Quote,
  Send,
  Star,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import Stars from "@/components/ui/Stars";
import { deleteReview, fetchReviews, replyToReview, submitReview } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatDateTime, plural, relativeTime } from "@/lib/format";
import type { Review, ReviewSummary, UserProfile } from "@/types/product";

type SortMode = "new" | "top" | "bottom";

const SORTS: Array<{ value: SortMode; label: string }> = [
  { value: "new", label: "Сначала новые" },
  { value: "top", label: "Сначала полезные" },
  { value: "bottom", label: "Сначала критичные" },
];

/**
 * Отзывы: сводка по звёздам, форма написания (1 отзыв на товар — повторная
 * отправка обновляет текст), лента и ответы продавца.
 */
export default function ReviewsSection({
  productId,
  initialReviews,
  initialSummary,
  user,
  canReply,
  shopName,
}: {
  productId: number;
  initialReviews: Review[];
  initialSummary: ReviewSummary;
  user: UserProfile | null;
  canReply: boolean;
  shopName?: string;
}) {
  const router = useRouter();
  const { showToast } = useCart();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [summary, setSummary] = useState<ReviewSummary>(initialSummary);
  const [sort, setSort] = useState<SortMode>("new");
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const own = reviews.find((review) => review.own) ?? null;

  const visible = useMemo(() => {
    const list = filterStar ? reviews.filter((r) => r.rating === filterStar) : [...reviews];
    if (sort === "top") return list.sort((a, b) => b.rating - a.rating);
    if (sort === "bottom") return list.sort((a, b) => a.rating - b.rating);
    return list.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }, [reviews, sort, filterStar]);

  const refresh = async () => {
    const data = await fetchReviews(productId);
    setReviews(data.results);
    setSummary(data.summary);
    router.refresh();
  };

  return (
    <section id="reviews" className="mt-12 scroll-mt-24">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold text-ink md:text-2xl">
          Отзывы покупателей{" "}
          <span className="font-medium text-muted">({summary.count})</span>
        </h2>
        <span className="rounded-lg bg-brand-soft px-2.5 py-1 text-[12px] font-semibold text-brand">
          Оставлять отзывы могут только авторизованные пользователи
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Сводка + форма */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <div className="flex items-end gap-3">
              <span className="text-[40px] font-extrabold leading-none text-ink">
                {summary.average > 0 ? summary.average.toFixed(1).replace(".", ",") : "—"}
              </span>
              <div className="pb-1">
                <Stars value={summary.average} showValue={false} />
                <p className="mt-1 text-[12px] text-muted">
                  {summary.count} {plural(summary.count, ["отзыв", "отзыва", "отзывов"])}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              {summary.breakdown.map((bucket) => {
                const percent = summary.count
                  ? Math.round((bucket.count / summary.count) * 100)
                  : 0;
                const active = filterStar === bucket.stars;
                return (
                  <button
                    key={bucket.stars}
                    type="button"
                    onClick={() => setFilterStar(active ? null : bucket.stars)}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <span className="w-7 shrink-0 text-[12px] font-semibold text-gray-600">
                      {bucket.stars} ★
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                      <span
                        className={`block h-full rounded-full transition-all ${
                          active ? "bg-brand" : "bg-[#FFB800]"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right text-[12px] text-muted">
                      {bucket.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {filterStar && (
              <button
                type="button"
                onClick={() => setFilterStar(null)}
                className="mt-3 text-[12px] font-semibold text-brand hover:underline"
              >
                Показать все отзывы
              </button>
            )}
          </div>

          <ReviewComposer
            user={user}
            productId={productId}
            own={own}
            onDone={async (message) => {
              await refresh();
              showToast(message);
            }}
          />
        </div>

        {/* Лента */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted">Сортировка:</span>
            {SORTS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSort(option.value)}
                className={`rounded-lg px-2.5 py-1 text-[12.5px] font-semibold transition-colors ${
                  sort === option.value
                    ? "bg-ink text-white"
                    : "bg-white text-gray-600 ring-1 ring-line hover:text-brand"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center ring-1 ring-line">
              <Quote className="mx-auto text-gray-300" size={30} />
              <p className="mt-3 text-sm text-muted">
                {summary.count === 0
                  ? "Отзывов пока нет — ваш может быть первым."
                  : "Под выбранный фильтр отзывов нет."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((review) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  canReply={canReply}
                  shopName={shopName}
                  busy={busy}
                  setBusy={setBusy}
                  onChanged={refresh}
                  onToast={showToast}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- форма ------------------------------- */
function ReviewComposer({
  user,
  productId,
  own,
  onDone,
}: {
  user: UserProfile | null;
  productId: number;
  own: Review | null;
  onDone: (message: string) => Promise<void>;
}) {
  const [rating, setRating] = useState(own?.rating ?? 5);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState(own?.text ?? "");
  const [pros, setPros] = useState(own?.pros ?? "");
  const [cons, setCons] = useState(own?.cons ?? "");
  const [detailed, setDetailed] = useState(!!own?.pros || !!own?.cons);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="rounded-2xl bg-brand-soft p-5 text-center">
        <MessageSquare className="mx-auto text-brand" size={22} />
        <p className="mt-2 text-[14px] font-semibold text-ink">
          Хотите поделиться впечатлением?
        </p>
        <p className="mt-1 text-[13px] leading-snug text-muted">
          Войдите в аккаунт — отзыв появится сразу в карточке товара.
        </p>
        <Link
          href={`/login?redirect=/product/${productId}`}
          className="mt-3 inline-block rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Войти и написать отзыв
        </Link>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await submitReview(productId, {
        rating,
        text,
        pros: detailed ? pros : "",
        cons: detailed ? cons : "",
      });
      await onDone(result.detail);
      setText("");
      setPros("");
      setCons("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить отзыв");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="rounded-2xl bg-white p-5 ring-1 ring-line"
    >
      <h3 className="text-[15px] font-bold text-ink">
        {own ? "Изменить ваш отзыв" : "Написать отзыв"}
      </h3>

      <div className="mt-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onMouseEnter={() => setHover(value)}
            onClick={() => setRating(value)}
            aria-label={`Оценка ${value} из 5`}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              size={24}
              className={
                (hover || rating) >= value
                  ? "fill-[#FFB800] text-[#FFB800]"
                  : "text-gray-300"
              }
            />
          </button>
        ))}
        <span className="ml-1.5 text-[13px] font-medium text-muted">
          {rating} из 5
        </span>
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        maxLength={2000}
        placeholder="Что понравилось, что нет, как прошёл заказ и доставка…"
        className="mt-3 w-full resize-y rounded-xl border border-line px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-brand"
      />
      <div className="mt-1 flex items-center justify-between text-[11.5px] text-muted">
        <button
          type="button"
          onClick={() => setDetailed((v) => !v)}
          className="font-semibold text-brand hover:underline"
        >
          {detailed ? "Короткий отзыв" : "Добавить достоинства и недостатки"}
        </button>
        <span>{text.length}/2000</span>
      </div>

      {detailed && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={pros}
            onChange={(event) => setPros(event.target.value)}
            maxLength={200}
            placeholder="Достоинства"
            className="rounded-xl border border-line px-3 py-2 text-[13.5px] outline-none focus:border-brand"
          />
          <input
            value={cons}
            onChange={(event) => setCons(event.target.value)}
            maxLength={200}
            placeholder="Недостатки"
            className="rounded-xl border border-line px-3 py-2 text-[13.5px] outline-none focus:border-brand"
          />
        </div>
      )}

      {error && (
        <p className="mt-2.5 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || text.trim().length < 15}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[14px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {busy ? (
          <LoaderCircle size={17} className="animate-spin" />
        ) : (
          <Send size={17} />
        )}
        {own ? "Сохранить изменения" : "Опубликовать отзыв"}
      </button>
      <p className="mt-2 text-[11.5px] leading-snug text-muted">
        Минимум 15 символов. Отзыв виден всем покупателям товара.
      </p>
    </form>
  );
}

/* ------------------------------ один отзыв ------------------------------ */
function ReviewItem({
  review,
  canReply,
  shopName,
  busy,
  setBusy,
  onChanged,
  onToast,
}: {
  review: Review;
  canReply: boolean;
  shopName?: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onChanged: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState(review.seller_reply ?? "");

  const remove = async () => {
    if (!window.confirm("Удалить отзыв?")) return;
    setBusy(true);
    try {
      await deleteReview(review.id);
      await onChanged();
      onToast("Отзыв удалён");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Не удалось удалить отзыв");
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    setBusy(true);
    try {
      await replyToReview(review.id, reply);
      await onChanged();
      setReplyOpen(false);
      onToast("Ответ опубликован");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Не удалось ответить");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-2xl bg-white p-4 ring-1 ring-line">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">
          {review.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[14px] font-bold text-ink">{review.author}</p>
            {review.verified && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#EAF7EE] px-1.5 py-0.5 text-[11px] font-semibold text-green-700">
                <BadgeCheck size={12} /> заказ подтверждён
              </span>
            )}
            <span className="text-[12px] text-muted" title={formatDateTime(review.created_at)}>
              · {relativeTime(review.created_at)}
            </span>
          </div>
          <div className="mt-1">
            <Stars value={review.rating} showValue={false} size={13} />
          </div>
        </div>
        {review.own && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label="Удалить отзыв"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="mt-2.5 space-y-2 text-[14px] leading-relaxed text-gray-700">
        <p className="whitespace-pre-line">{review.text}</p>
        {(review.pros || review.cons) && (
          <div className="grid gap-2 rounded-xl bg-surface/60 p-3 text-[13px] sm:grid-cols-2">
            {review.pros && (
              <p>
                <span className="font-semibold text-green-700">Достоинства: </span>
                {review.pros}
              </p>
            )}
            {review.cons && (
              <p>
                <span className="font-semibold text-[#B45309]">Недостатки: </span>
                {review.cons}
              </p>
            )}
          </div>
        )}
      </div>

      {review.seller_reply ? (
        <div className="mt-3 rounded-xl border-l-2 border-brand bg-brand-soft/60 p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-brand">
            <ThumbsUp size={13} /> Ответ продавца{shopName ? ` · ${shopName}` : ""}
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-gray-700">
            {review.seller_reply}
          </p>
        </div>
      ) : canReply ? (
        <div className="mt-3">
          {replyOpen ? (
            <div className="rounded-xl bg-surface/60 p-3">
              <textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={3}
                placeholder="Ответьте покупателю — это повышает доверие к магазину"
                className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-[13.5px] outline-none focus:border-brand"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReplyOpen(false)}
                  className="rounded-lg px-3 py-2 text-[13px] font-semibold text-muted hover:text-ink"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={busy || reply.trim().length < 5}
                  className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
                >
                  Отправить ответ
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setReplyOpen(true)}
              className="text-[13px] font-semibold text-brand hover:underline"
            >
              Ответить на отзыв
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}
