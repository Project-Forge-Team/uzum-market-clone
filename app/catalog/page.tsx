import Link from "next/link";
import { ArrowRight, Sparkles, Store } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import { listCategories, listSellers, marketplaceStats } from "@/lib/server/catalog";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Каталог" };

/** Витрина категорий: с неё начинают те, кто ещё не знает, что искать. */
export default function CatalogIndexPage() {
  const categories = listCategories();
  const sellers = listSellers().slice(0, 6);
  const stats = marketplaceStats();

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6">
      <SectionHeader
        title="Каталог товаров"
        subtitle={`${formatNumber(stats.products)} товаров в ${stats.categories} категориях · ${stats.sellers} магазинов`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/catalog/${cat.slug}`}
            className="group relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-line transition-all hover:-translate-y-0.5 hover:ring-brand-border"
          >
            <span
              className="grid h-12 w-12 place-items-center rounded-2xl text-[24px]"
              style={{ background: cat.color }}
              aria-hidden
            >
              {cat.emoji}
            </span>
            <h2 className="mt-3.5 text-[15px] font-bold text-ink">{cat.name}</h2>
            <p className="mt-1 text-[12.5px] text-muted">{cat.product_count} товаров</p>
            <ArrowRight
              size={16}
              className="absolute right-4 top-5 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand"
            />
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-brand-soft p-6">
          <Sparkles size={20} className="text-brand" />
          <h2 className="mt-3 text-lg font-bold text-ink">Не знаете, с чего начать?</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-gray-700">
            Откройте подборку со скидками или отфильтруйте категорию по цене, рейтингу
            и наличию — фильтры сохраняются в ссылке.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/search?discounted=1"
              className="rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-dark"
            >
              Товары со скидкой
            </Link>
            <Link
              href="/search?ordering=rating"
              className="rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold text-brand ring-1 ring-brand-border transition-colors hover:bg-white/60"
            >
              Топ по рейтингу
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 ring-1 ring-line">
          <Store size={20} className="text-brand" />
          <h2 className="mt-3 text-lg font-bold text-ink">Магазины недели</h2>
          <ul className="mt-3 space-y-2">
            {sellers.map((seller) => (
              <li key={seller.id}>
                <Link
                  href={`/shop/${seller.slug}`}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-[13.5px] transition-colors hover:bg-surface"
                >
                  <span className="font-semibold text-ink">{seller.name}</span>
                  <span className="text-muted">
                    {seller.rating > 0 ? `${seller.rating.toFixed(1)} ★` : "—"} ·{" "}
                    {seller.product_count} тов.
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/sellers"
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline"
          >
            Все магазины <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
