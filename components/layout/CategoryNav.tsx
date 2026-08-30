import Link from "next/link";
import type { Category } from "@/types/product";

/** Горизонтальное меню категорий под шапкой. */
export default function CategoryNav({
  categories = [],
  activeSlug,
}: {
  categories?: Array<Category & { product_count?: number }>;
  activeSlug?: string;
}) {
  if (!categories.length) return null;

  return (
    <nav className="border-b border-line bg-white">
      <div className="mx-auto w-full max-w-[1240px] px-4">
        <ul className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-2.5">
          {categories.map((cat) => {
            const active = cat.slug === activeSlug;
            return (
              <li key={cat.id} className="shrink-0">
                <Link
                  href={`/catalog/${cat.slug}`}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-brand text-white"
                      : "bg-surface text-gray-700 hover:bg-brand-soft hover:text-brand"
                  }`}
                >
                  <span aria-hidden>{cat.emoji}</span>
                  {cat.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
