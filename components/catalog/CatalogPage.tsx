import Link from "next/link";
import { ChevronRight, SearchX } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import Pagination from "@/components/ui/Pagination";
import SectionHeader from "@/components/ui/SectionHeader";
import EmptyState from "@/components/ui/EmptyState";
import FilterPanel from "@/components/catalog/FilterPanel";
import SortTabs from "@/components/catalog/SortTabs";
import type { ProductListResult } from "@/lib/api-server";
import type { Category } from "@/types/product";
import { productsWord } from "@/lib/format";

export interface CatalogPageProps {
  heading: string;
  subheading?: string;
  crumbs: Array<{ label: string; href?: string }>;
  list: ProductListResult;
  /** "/catalog/elektronika" или "/search" */
  basePath: string;
  /** Текущие query-параметры (без page) — из них собираются ссылки. */
  params: Record<string, string | undefined>;
  categories?: Array<Category & { product_count?: number }>;
  activeCategorySlug?: string;
}

function buildParams(
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
) {
  const merged = new URLSearchParams();
  const all = { ...params, ...overrides };
  for (const [key, value] of Object.entries(all)) {
    if (key === "page") continue;
    if (value === undefined || value === "") continue;
    merged.set(key, value);
  }
  return merged.toString();
}

/**
 * Оболочка для любой витрины (категория, поиск, «скидки», магазин):
 * хлебные крошки → фильтры → сортировка → сетка → пагинация.
 * Всё на ссылках, поэтому работает без JS и индексируется поисковиками.
 */
export default function CatalogPage({
  heading,
  subheading,
  crumbs,
  list,
  basePath,
  params,
  categories = [],
  activeCategorySlug,
}: CatalogPageProps) {
  const { results, count, page, total_pages: totalPages, facets } = list;

  const queryString = buildParams(params, {});
  const paginationTemplate = `${basePath}?${queryString}${queryString ? "&" : "?"}page={page}`;
  const sortQuery = (ordering: string) => buildParams(params, { ordering });

  const activeFilterCount = [
    "min_price",
    "max_price",
    "min_rating",
    "discounted",
    "in_stock",
  ].filter((key) => params[key]).length;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6">
      <nav aria-label="Хлебные крошки" className="mb-4 flex items-center gap-1 overflow-x-auto text-[13px] text-muted no-scrollbar">
        {crumbs.map((crumb, index) => (
          <span key={crumb.label} className="flex shrink-0 items-center gap-1">
            {index > 0 && <ChevronRight size={13} className="text-gray-300" />}
            {crumb.href ? (
              <Link href={crumb.href} className="transition-colors hover:text-brand">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-gray-700">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <SectionHeader
        title={heading}
        subtitle={subheading ?? productsWord(count)}
        href="/catalog"
        linkLabel="Все категории"
      />

      {categories.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/catalog/${cat.slug}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                cat.slug === activeCategorySlug
                  ? "bg-brand text-white"
                  : "bg-surface text-gray-700 hover:bg-brand-soft hover:text-brand"
              }`}
            >
              <span aria-hidden>{cat.emoji}</span>
              {cat.name}
              <span className="opacity-60">{cat.product_count ?? 0}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-5 lg:flex-row">
        <FilterPanel priceBounds={facets.price} />

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">
              Найдено: <span className="font-semibold text-ink">{count}</span>
              {activeFilterCount > 0 && (
                <span className="ml-2 rounded-md bg-brand-soft px-2 py-0.5 text-[12px] font-semibold text-brand">
                  активных фильтров: {activeFilterCount}
                </span>
              )}
            </p>
            <SortTabs
              basePath={basePath}
              current={params.ordering ?? ""}
              buildQuery={sortQuery}
            />
          </div>

          {results.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} template={paginationTemplate} />
            </>
          ) : (
            <EmptyState
              icon={SearchX}
              title="Под фильтры ничего не подошло"
              text="Попробуйте убрать часть условий или перейти в другую категорию."
              actionHref="/catalog"
              actionLabel="Открыть весь каталог"
              secondaryHref="/search"
              secondaryLabel="Расширенный поиск"
            />
          )}
        </div>
      </div>
    </div>
  );
}
