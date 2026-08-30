"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Search, X } from "lucide-react";
import { fetchProducts } from "@/lib/api";
import ProductImage from "@/components/ui/ProductImage";
import { formatNumber } from "@/lib/format";
import type { Product } from "@/types/product";

const POPULAR = ["Наушники", "Кроссовки", "Робот-пылесос", "Конструктор", "Смартфон"];

export default function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (timer.current) window.clearTimeout(timer.current);
    if (value.length < 2) {
      // Список подсказок при коротком запросе не рендерится, поэтому специально
      // очищать suggestions в эффекте не нужно.
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        const data = await fetchProducts({ q: value, page_size: 6 });
        setSuggestions(data.results);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [query]);

  const submit = () => {
    const value = query.trim();
    setOpen(false);
    if (!value) {
      router.push("/catalog");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <div ref={boxRef} className={`relative flex-1 ${className}`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex w-full items-center"
      >
        <input
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setLoading(next.trim().length >= 2);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          type="search"
          placeholder="Искать товары и категории"
          aria-label="Поиск по каталогу"
          className="h-10 w-full rounded-l-xl border border-r-0 border-line bg-white px-4 pr-10 text-sm outline-none transition-colors focus:border-brand md:h-11"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
            }}
            className="absolute right-12 grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-surface"
            aria-label="Очистить"
          >
            <X size={14} />
          </button>
        )}
        <button
          type="submit"
          className="grid h-10 w-12 place-items-center rounded-r-xl border border-l-0 border-line bg-surface text-gray-600 transition-colors hover:bg-[#e4e6eb] md:h-11"
          aria-label="Найти"
        >
          {loading ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <Search size={18} />
          )}
        </button>
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-line">
          {query.trim().length < 2 ? (
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Popular searches
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {POPULAR.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setQuery(item);
                      submit();
                    }}
                    className="rounded-lg bg-surface px-3 py-1.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-brand-soft hover:text-brand"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : suggestions.length === 0 ? (
            <p className="p-4 text-sm text-muted">
              Ничего не нашлось. Попробуйте другое слово — например «наушники».
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {suggestions.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/product/${product.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-brand-soft/60"
                  >
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                      <ProductImage
                        src={product.image}
                        alt={product.title}
                        sizes="40px"
                        className="p-0.5"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {product.title}
                      </span>
                      <span className="block truncate text-[12px] text-muted">
                        {product.category?.name} · {product.seller?.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-bold text-ink">
                      {formatNumber(product.price)}
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={submit}
                  className="w-full bg-brand-soft/60 px-3 py-2.5 text-left text-[13px] font-semibold text-brand transition-colors hover:bg-brand-soft"
                >
                  Показать все результаты по «{query.trim()}»
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
