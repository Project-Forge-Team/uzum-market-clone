import { fetchProducts, fetchCategory } from "@/lib/api";
import ProductCard from "@/components/ui/ProductCard";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";

  // Параллельно: товары + имя категории (раньше ждали друг друга)
  const [data, cat] = await Promise.all([
    fetchProducts({
      search: q || undefined,
      category: category || undefined,
      page: 1,
    }),
    category ? fetchCategory(category) : Promise.resolve(null),
  ]);

  const products = data.results || [];
  const total = data.count || 0;
  const categoryName = cat?.name ?? null;

  const heading = q
    ? `Результаты поиска: «${q}»`
    : categoryName
      ? categoryName
      : "Все товары";

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 mt-6 mb-16">
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-[#7000FF] transition-colors">
          Главная
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-700">{heading}</span>
      </nav>

      <h1 className="text-2xl font-bold mb-2">{heading}</h1>
      <p className="text-sm text-gray-500 mb-6">Найдено товаров: {total}</p>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">Ничего не найдено.</p>
          <p className="text-sm mt-2">
            Попробуйте изменить запрос или вернуться на{" "}
            <Link href="/" className="text-[#7000FF] hover:underline">
              главную
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
