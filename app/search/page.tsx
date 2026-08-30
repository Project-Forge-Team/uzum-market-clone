import CatalogPage from "@/components/catalog/CatalogPage";
import { getCategory, listCategories, listProducts } from "@/lib/server/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Поиск по каталогу" };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const NUMERIC = ["min_price", "max_price", "min_rating", "page", "page_size"];

function pick(sp: Record<string, string | undefined>) {
  const params: Record<string, string | undefined> = {};
  for (const key of [
    "q",
    "category",
    "seller",
    "ordering",
    "discounted",
    "in_stock",
    ...NUMERIC,
  ]) {
    if (sp[key]) params[key] = sp[key];
  }
  return params;
}

/**
 * Страница поиска. Те же фильтры и сортировка, что и в категории:
 * состояние живёт в query-строке, поэтому результат можно скопировать ссылкой.
 */
export default async function SearchPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const params = pick(sp);
  const q = (params.q ?? "").trim();

  const [list, categories, category] = await Promise.all([
    listProducts({
      ...params,
      page: params.page ? Number(params.page) : 1,
      discounted: params.discounted === "1",
      in_stock: params.in_stock === "1",
    }),
    listCategories(),
    params.category ? getCategory(params.category) : Promise.resolve(null),
  ]);

  const heading = q
    ? `Результаты поиска: «${q}»`
    : category
      ? category.name
      : params.discounted
        ? "Товары со скидкой"
        : "Все товары маркетплейса";

  return (
    <CatalogPage
      heading={heading}
      subheading={
        q
          ? `${list.count} ${list.count === 1 ? "совпадение" : "совпадений"} по запросу`
          : undefined
      }
      crumbs={[
        { label: "Главная", href: "/" },
        { label: "Каталог", href: "/catalog" },
        ...(category ? [{ label: category.name, href: `/catalog/${category.slug}` }] : []),
        { label: q || "Поиск" },
      ]}
      list={list}
      basePath="/search"
      params={params}
      categories={categories}
      activeCategorySlug={category?.slug}
    />
  );
}
