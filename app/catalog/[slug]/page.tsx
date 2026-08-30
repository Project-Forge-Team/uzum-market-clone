import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CatalogPage from "@/components/catalog/CatalogPage";
import { getCategoryBySlugOrId, listCategories, listProducts } from "@/lib/server/catalog";
import { getCurrentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlugOrId(slug);
  if (!category) return { title: "Категория не найдена" };
  return {
    title: `${category.name} — каталог`,
    description: `Товары категории «${category.name}» с фильтрами по цене, рейтингу и скидкам.`,
  };
}

/** Категория каталога: список товаров + фильтры + сортировка + пагинация. */
export default async function CategoryPage({ params, searchParams }: PageProps) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = getCategoryBySlugOrId(slug);
  if (!category) notFound();

  const user = await getCurrentUser();

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

  const list = listProducts({
    ...filters,
    min_price: sp.min_price ? Number(sp.min_price) : undefined,
    max_price: sp.max_price ? Number(sp.max_price) : undefined,
    min_rating: sp.min_rating ? Number(sp.min_rating) : undefined,
    page: sp.page ? Number(sp.page) : 1,
    discounted: sp.discounted === "1",
    in_stock: sp.in_stock === "1",
    viewerId: user?.id ?? null,
  });

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
      categories={listCategories()}
      activeCategorySlug={category.slug}
    />
  );
}
