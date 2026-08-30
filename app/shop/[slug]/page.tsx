import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  BadgeCheck,
  ChevronRight,
  MapPin,
  MessageSquareQuote,
  Package,
  Star,
  Store,
} from "lucide-react";
import CatalogPage from "@/components/catalog/CatalogPage";
import ProductCard from "@/components/ui/ProductCard";
import {
  getCategory,
  getSeller,
  listCategories,
  listProducts,
} from "@/lib/server/data";
import { formatNumber, productsWord } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getSeller(slug);
  if (!shop) return { title: "Магазин не найден" };
  return {
    title: `${shop.name} — магазин на Uzum Market`,
    description: shop.description.slice(0, 160),
  };
}

/** Публичная страница магазина: витрина + отзывы покупателей о товарах. */
export default async function ShopPage({ params, searchParams }: PageProps) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const shop = await getSeller(slug);
  if (!shop) notFound();

  const category = sp.category ? await getCategory(sp.category) : null;

  const filters = {
    category: category?.slug,
    q: sp.q,
    ordering: sp.ordering,
    min_price: sp.min_price,
    max_price: sp.max_price,
    page: sp.page,
    discounted: sp.discounted,
  };

  const [list, categories] = await Promise.all([
    listProducts({
      ...filters,
      seller: shop.slug,
      category: category?.slug,
      page: sp.page ? Number(sp.page) : 1,
      discounted: sp.discounted === "1",
    }),
    listCategories(),
  ]);

  // Публичных агрегатов по магазину бэкенд не отдаёт отдельно — считаем по
  // витрине (`GET /sellers/{slug}/` возвращает активные товары магазина).
  const stats = {
    product_count: shop.product_count,
    order_count: shop.order_count ?? 0,
    views: shop.products.reduce((acc, p) => acc + p.views, 0),
  };

  return (
    <>
      <section className="border-b border-line bg-surface/50">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-6">
          <nav className="mb-4 flex items-center gap-1 text-[13px] text-muted">
            <Link href="/" className="hover:text-brand">
              Главная
            </Link>
            <ChevronRight size={13} className="text-gray-300" />
            <Link href="/sellers" className="hover:text-brand">
              Магазины
            </Link>
            <ChevronRight size={13} className="text-gray-300" />
            <span className="text-gray-700">{shop.name}</span>
          </nav>

          <div className="flex flex-wrap items-start gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand text-[22px] font-extrabold uppercase text-white">
              {shop.name.slice(0, 2)}
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-ink md:text-2xl">
                {shop.name}
                {shop.verified && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#EAF7EE] px-2 py-0.5 text-[11.5px] font-bold text-green-700">
                    <BadgeCheck size={13} /> проверен
                  </span>
                )}
              </h1>
              <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-gray-700">
                {shop.description}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13} /> {shop.city}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Package size={13} /> {productsWord(stats.product_count)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star size={13} className="fill-[#FFB800] text-[#FFB800]" />
                  {shop.rating > 0 ? shop.rating.toFixed(1).replace(".", ",") : "нет оценок"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquareQuote size={13} /> {shop.reviews_count} отзывов
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Store size={13} /> {shop.verified ? "документы проверены" : "проверка не пройдена"}
                </span>
              </p>
            </div>

            <div className="grid w-full shrink-0 grid-cols-3 gap-2 sm:w-auto">
              <MiniStat label="товаров" value={String(stats.product_count)} />
              <MiniStat label="заказов" value={String(stats.order_count)} />
              <MiniStat label="просмотров" value={formatNumber(stats.views)} />
            </div>
          </div>
        </div>
      </section>

      <CatalogPage
        heading="Товары магазина"
        crumbs={[{ label: "Магазины", href: "/sellers" }, { label: shop.name }]}
        list={list}
        basePath={`/shop/${shop.slug}`}
        params={filters}
        categories={categories}
        activeCategorySlug={category?.slug}
      />

      {shop.products.length === 0 && (
        <div className="mx-auto mb-10 w-full max-w-[1240px] px-4">
          <p className="rounded-2xl bg-brand-soft p-5 text-[13.5px] text-brand">
            Продавец ещё не выложил товары, но уже отвечает на сообщения — загляните
            позже.
          </p>
        </div>
      )}

      {shop.products.length > 0 && (
        <section className="mx-auto w-full max-w-[1240px] px-4 pb-10">
          <h2 className="mb-4 text-lg font-bold text-ink">Новинки магазина</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {shop.products
              .slice()
              .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
              .slice(0, 5)
              .map((product) => (
                <ProductCard key={product.id} product={product} showDelivery />
              ))}
          </div>
        </section>
      )}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-line">
      <p className="text-[15px] font-extrabold text-ink">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
