import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CatalogPage from "@/components/catalog/CatalogPage";
import { getCategoryBySlugOrId, listCategories, listProducts } from "@/lib/api-server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlugOrId(slug);
  if (!category) return { title: "Категория не найдена" };
  return {
    title: `${category.name} — каталог`,
    description: `Товары категории «${category.name}» с фильтрами по цене, рейтингу и скидкам.`,
  };
}

/** Категория каталога: список товаров + фильтры + сортировка + пагинация. */
export default async function CategoryPage({ params, searchParams }: PageProps) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlugOrId(slug);
  if (!category) notFound();

  // Личность зрителя (has_own_review) несёт кука сессии — её прокидывает
  // сам api-server, параметр viewerId исторический.
  const [list, categories] = await Promise.all([
    listProducts({
      category: category.slug,
      q: sp.q,
      ordering: sp.ordering,
      min_price: sp.min_price ? Number(sp.min_price) : undefined,
      max_price: sp.max_price ? Number(sp.max_price) : undefined,
      min_rating: sp.min_rating ? Number(sp.min_rating) : undefined,
      page: sp.page ? Number(sp.page) : 1,
      discounted: sp.discounted === "1",
      in_stock: sp.in_stock === "1",
    }),
    listCategories(),
  ]);

  const filters = {
    category: category.slug,
    q: sp.q,
    ordering: sp.ordering,
    min_price: sp.min_price,
    max_price: sp.max_price,
    min_rating: sp.min_rating,
    discounted: sp.discounted,
    in_stock: sp.in_stock,
    page: sp.page,
  };

  return (
    <CatalogPage
      heading={`${category.emoji} ${category.name}`}
      subheading="Цены от продавцов маркетплейса, доставка по Узбекистану"
      crumbs={[
        { label: "Главная", href: "/" },
        { label: "Каталог", href: "/catalog" },
        { label: category.name },
      ]}
      list={list}
      basePath={`/catalog/${category.slug}`}
      params={filters}
      categories={categories}
      activeCategorySlug={category.slug}
    />
  );
}
