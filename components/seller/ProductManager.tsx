"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  ListChecks,
  LoaderCircle,
  PencilLine,
  PlusCircle,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ProductImage from "@/components/ui/ProductImage";
import { deleteProduct, setProductStatus } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatNumber } from "@/lib/format";
import type { Product } from "@/types/product";

const STATUSES = [
  { value: "all", label: "Все" },
  { value: "active", label: "В продаже" },
  { value: "draft", label: "Черновики" },
  { value: "archived", label: "Снятые" },
] as const;

/** Список товаров продавца с быстрым управлением статусом и удалением. */
export default function ProductManager({ initial }: { initial: Product[] }) {
  const router = useRouter();
  const { showToast } = useCart();
  const [rows, setRows] = useState<Product[]>(initial);
  const [status, setStatus] = useState<(typeof STATUSES)[number]["value"]>("all");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!needle) return true;
      return (
        row.title.toLowerCase().includes(needle) ||
        row.description.toLowerCase().includes(needle)
      );
    });
  }, [rows, status, q]);

  const changeStatus = async (product: Product, next: "active" | "archived" | "draft") => {
    setBusyId(product.id);
    try {
      await setProductStatus(product.id, next);
      setRows((prev) =>
        prev.map((row) => (row.id === product.id ? { ...row, status: next } : row)),
      );
      router.refresh();
      showToast(next === "active" ? "Товар опубликован" : "Товар снят с продажи");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Не удалось изменить статус");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (product: Product) => {
    if (!window.confirm(`Удалить «${product.title}» вместе с отзывами?`)) return;
    setBusyId(product.id);
    try {
      await deleteProduct(product.id);
      setRows((prev) => prev.filter((row) => row.id !== product.id));
      showToast("Товар удалён");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Не удалось удалить товар");
    } finally {
      setBusyId(null);
    }
  };

  if (!initial.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title="У магазина пока нет товаров"
        text="Выложите первый товар: название, фото, цена и характеристики. На проверку и публикацию уходит один клик — всё остальное можно отредактировать позже."
        actionHref="/cabinet/products/new"
        actionLabel="Добавить товар"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex overflow-hidden rounded-xl bg-white ring-1 ring-line">
          {STATUSES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                status === option.value ? "bg-ink text-white" : "text-gray-600 hover:bg-brand-soft hover:text-brand"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="relative ml-auto w-full max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Поиск по моим товарам"
            className="h-10 w-full rounded-xl border border-line pl-9 pr-3 text-[13.5px] outline-none transition-colors focus:border-brand"
          />
        </label>

        <Link
          href="/cabinet/products/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-dark"
        >
          <PlusCircle size={15} /> Добавить
        </Link>
      </div>

      <ul className="space-y-3">
        {filtered.map((product) => (
          <li key={product.id} className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <div className="flex flex-wrap items-start gap-3">
              <Link
                href={`/product/${product.id}`}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface"
              >
                <ProductImage src={product.image} alt={product.title} sizes="64px" />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${product.id}`}
                  className="line-clamp-1 text-[14.5px] font-bold text-ink transition-colors hover:text-brand"
                >
                  {product.title}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                  <span className="font-bold text-ink">{formatNumber(product.price)} сум</span>
                  {product.old_price && (
                    <span className="text-gray-400 line-through">
                      {formatNumber(product.old_price)}
                    </span>
                  )}
                  <span>остаток {product.stock}</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} /> {product.views}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Star size={12} className="fill-[#FFB800] text-[#FFB800]" />
                    {product.reviews_count > 0 ? product.rating.toFixed(1).replace(".", ",") : "нет отзывов"}
                  </span>
                </p>
              </div>

              <StatusBadge status={product.status} />

              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  href={`/cabinet/products/${product.id}`}
                  className="grid h-9 w-9 place-items-center rounded-lg text-gray-500 ring-1 ring-line transition-colors hover:text-brand hover:ring-brand-border"
                  aria-label="Редактировать"
                >
                  <PencilLine size={15} />
                </Link>
                <button
                  type="button"
                  disabled={busyId === product.id}
                  onClick={() =>
                    changeStatus(product, product.status === "active" ? "archived" : "active")
                  }
                  className="grid h-9 w-9 place-items-center rounded-lg text-gray-500 ring-1 ring-line transition-colors hover:text-brand hover:ring-brand-border disabled:opacity-50"
                  aria-label={product.status === "active" ? "Снять с продажи" : "Опубликовать"}
                >
                  {busyId === product.id ? (
                    <LoaderCircle size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                </button>
                <button
                  type="button"
                  disabled={busyId === product.id}
                  onClick={() => remove(product)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 ring-1 ring-line transition-colors hover:text-red-600 hover:ring-red-100 disabled:opacity-50"
                  aria-label="Удалить"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {product.reviews_count === 0 && product.status === "active" && (
              <p className="mt-3 rounded-xl bg-brand-soft/70 px-3 py-2 text-[12px] font-medium text-brand">
                Совет: попросите первых покупателей оставить отзыв — карточки без отзывов
                получают заметно меньше кликов.
              </p>
            )}
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="rounded-xl bg-surface/70 px-4 py-3 text-[13.5px] text-muted">
          Под выбранный фильтр товаров нет — сбросьте статус или поиск.
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Product["status"] }) {
  const map = {
    active: { label: "В продаже", cls: "bg-[#EAF7EE] text-green-700" },
    draft: { label: "Черновик", cls: "bg-[#FFF4E5] text-[#9A5B00]" },
    archived: { label: "Снят", cls: "bg-surface text-gray-500" },
  } as const;
  const item = map[status];
  return (
    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[11.5px] font-bold ${item.cls}`}>
      {item.label}
    </span>
  );
}
