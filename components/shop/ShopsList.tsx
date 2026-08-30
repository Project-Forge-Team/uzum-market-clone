"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Package, Search, Star } from "lucide-react";
import type { Seller } from "@/types/product";

type ShopCard = Seller & { product_count: number; order_count: number };

const SORTS = [
  { value: "rating", label: "По рейтингу" },
  { value: "products", label: "По числу товаров" },
  { value: "az", label: "А–Я" },
] as const;

export default function ShopsList({ sellers }: { sellers: ShopCard[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("rating");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? sellers.filter(
          (shop) =>
            shop.name.toLowerCase().includes(needle) ||
            shop.city.toLowerCase().includes(needle) ||
            shop.description.toLowerCase().includes(needle),
        )
      : sellers;
    const sorted = [...filtered];
    if (sort === "products") sorted.sort((a, b) => b.product_count - a.product_count);
    if (sort === "az") sorted.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    if (sort === "rating") sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [sellers, q, sort]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <label className="relative w-full max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Поиск по названию или городу"
            className="h-11 w-full rounded-xl border border-line pl-9 pr-3 text-[14px] outline-none transition-colors focus:border-brand"
          />
        </label>
        <div className="flex overflow-hidden rounded-xl bg-white ring-1 ring-line">
          {SORTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSort(option.value)}
              className={`px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                sort === option.value ? "bg-ink text-white" : "text-gray-600 hover:bg-brand-soft hover:text-brand"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="ml-auto text-[13px] text-muted">найдено: {rows.length}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((shop) => (
          <Link
            key={shop.id}
            href={`/shop/${shop.slug}`}
            className="group flex h-full flex-col rounded-2xl bg-white p-5 ring-1 ring-line transition-all hover:-translate-y-0.5 hover:ring-brand-border"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-[15px] font-bold text-brand">
                {shop.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-bold text-ink group-hover:text-brand">
                    {shop.name}
                  </span>
                  {shop.verified && <BadgeCheck size={15} className="shrink-0 text-green-600" />}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-muted">{shop.city}</span>
              </span>
            </div>

            <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-gray-700">
              {shop.description}
            </p>

            <p className="mt-auto flex items-center gap-3 pt-3 text-[12.5px] font-semibold text-gray-700">
              <span className="inline-flex items-center gap-1">
                <Package size={13} className="text-gray-400" /> {shop.product_count}
              </span>
              <span className="inline-flex items-center gap-1">
                <Star size={13} className="fill-[#FFB800] text-[#FFB800]" />
                {shop.rating > 0 ? shop.rating.toFixed(1).replace(".", ",") : "—"}
              </span>
              <span className="ml-auto text-muted">{shop.order_count} заказов</span>
            </p>
          </Link>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="rounded-2xl bg-surface/70 px-4 py-6 text-center text-[14px] text-muted">
          Ничего не нашлось — попробуйте другой город или название.
        </p>
      )}
    </>
  );
}
