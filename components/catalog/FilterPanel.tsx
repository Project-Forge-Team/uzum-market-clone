"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { formatNumber } from "@/lib/format";

interface FilterValue {
  key: string;
  value?: string;
}

/**
 * Фильтры каталога. Всё живёт в query-строке: ссылку можно расшарить,
 * а сервер отдаёт уже отфильтрованный HTML (без клиентского waterfall).
 */
export default function FilterPanel({
  priceBounds,
}: {
  priceBounds: { min: number; max: number };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  // URL — источник истины для диапазона цены; локальный черновик живёт,
  // пока покупатель не нажал «Применить» (тогда черновик сбрасывается).
  const [draft, setDraft] = useState<{ min: string; max: string } | null>(null);
  const minPrice = draft?.min ?? searchParams.get("min_price") ?? "";
  const maxPrice = draft?.max ?? searchParams.get("max_price") ?? "";
  const setMinPrice = (value: string) => setDraft({ min: value, max: maxPrice });
  const setMaxPrice = (value: string) => setDraft({ min: minPrice, max: value });

  const current = (key: string) => searchParams.get(key) ?? "";
  const isActive = (key: string) => searchParams.get(key) === "1";
  const minRating = current("min_rating");

  const apply = (updates: FilterValue[]) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const { key, value } of updates) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    setDraft(null);
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`);
  };

  const toggle = (key: string) =>
    apply([{ key, value: isActive(key) ? "" : "1" }]);

  const priceInput =
    "h-10 w-full rounded-lg border border-line px-3 text-sm outline-none transition-colors focus:border-brand";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:ring-brand-border lg:hidden"
      >
        <SlidersHorizontal size={16} /> Фильтры
      </button>

      <aside className="hidden w-[248px] shrink-0 lg:block">
        <div className="sticky top-24 space-y-5 rounded-2xl bg-white p-4 ring-1 ring-line">
          <FilterBlock title="Цена, сум">
            <div className="flex items-center gap-2">
              <input
                className={priceInput}
                inputMode="numeric"
                placeholder={`от ${formatNumber(priceBounds.min)}`}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value.replace(/[^\d]/g, ""))}
              />
              <span className="text-muted">—</span>
              <input
                className={priceInput}
                inputMode="numeric"
                placeholder={`до ${formatNumber(priceBounds.max)}`}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <button
              type="button"
              onClick={() =>
                apply([
                  { key: "min_price", value: minPrice },
                  { key: "max_price", value: maxPrice },
                ])
              }
              className="mt-2.5 w-full rounded-lg bg-brand-soft py-2 text-[13px] font-semibold text-brand transition-colors hover:bg-brand-border"
            >
              Применить цену
            </button>
          </FilterBlock>

          <FilterBlock title="Скидки и наличие">
            <CheckRow label="Только со скидкой" checked={isActive("discounted")} onChange={() => toggle("discounted")} />
            <CheckRow label="В наличии" checked={isActive("in_stock")} onChange={() => toggle("in_stock")} />
          </FilterBlock>

          <FilterBlock title="Рейтинг">
            <div className="flex flex-wrap gap-1.5">
              {["", "4", "4.5"].map((value) => (
                <button
                  key={value || "any"}
                  type="button"
                  onClick={() => apply([{ key: "min_rating", value }])}
                  className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                    minRating === value
                      ? "bg-ink text-white"
                      : "bg-surface text-gray-600 hover:text-brand"
                  }`}
                >
                  {value ? `${value.replace(".", ",")} ★ и выше` : "Любой"}
                </button>
              ))}
            </div>
          </FilterBlock>

          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              ["min_price", "max_price", "discounted", "in_stock", "min_rating", "page"].forEach((k) =>
                params.delete(k),
              );
              router.push(`${pathname}${params.toString() ? `?${params}` : ""}`);
            }}
            className="w-full rounded-lg py-2 text-[13px] font-medium text-muted transition-colors hover:text-brand"
          >
            Сбросить фильтры
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="h-full w-[86%] max-w-sm overflow-y-auto bg-white p-5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Фильтры каталога"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Фильтры</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-surface" aria-label="Закрыть">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-5">
              <FilterBlock title="Цена, сум">
                <div className="flex items-center gap-2">
                  <input className={priceInput} placeholder={`от ${formatNumber(priceBounds.min)}`} value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^\d]/g, ""))} />
                  <span className="text-muted">—</span>
                  <input className={priceInput} placeholder={`до ${formatNumber(priceBounds.max)}`} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d]/g, ""))} />
                </div>
              </FilterBlock>
              <FilterBlock title="Скидки и наличие">
                <CheckRow label="Только со скидкой" checked={isActive("discounted")} onChange={() => toggle("discounted")} />
                <CheckRow label="В наличии" checked={isActive("in_stock")} onChange={() => toggle("in_stock")} />
              </FilterBlock>
              <FilterBlock title="Рейтинг">
                <div className="flex flex-wrap gap-1.5">
                  {["", "4", "4.5"].map((value) => (
                    <button
                      key={value || "any"}
                      type="button"
                      onClick={() => {
                        apply([{ key: "min_rating", value }]);
                        setOpen(false);
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-medium ${
                        minRating === value ? "bg-ink text-white" : "bg-surface text-gray-600"
                      }`}
                    >
                      {value ? `${value.replace(".", ",")} ★ и выше` : "Любой"}
                    </button>
                  ))}
                </div>
              </FilterBlock>
              <button
                type="button"
                onClick={() => {
                  apply([
                    { key: "min_price", value: minPrice },
                    { key: "max_price", value: maxPrice },
                  ]);
                  setOpen(false);
                }}
                className="w-full rounded-xl bg-brand py-3 font-semibold text-white"
              >
                Показать товары
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-muted">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="mb-1.5 flex cursor-pointer items-center gap-2.5 text-[14px] text-gray-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded border-gray-300" />
      {label}
    </label>
  );
}
