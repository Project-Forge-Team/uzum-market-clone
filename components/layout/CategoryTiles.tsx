import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/types/product";

const TILES: Record<string, string> = {
  elektronika: "Смартфоны, аудио и комплектующие",
  "bytovaya-tehnika": "Кухня, чистота и климат",
  odezhda: "Базовый гардероб и обувь",
  "detskiy-mir": "Игрушки, школа и всё для малышей",
  "dom-i-sad": "Уют, текстиль и сад",
  krasota: "Уход, парфюмерия и стайлинг",
  sport: "Зал, улица и велосипеды",
  knigi: "Учебники, художка и канцелярия",
  avto: "Аксессуары, электроника, инструмент",
  remont: "Инструмент и отделка",
};

/** Плитки категорий как в оригинале — но с нашим наполнением и без картинок из интернета. */
export default function CategoryTiles({
  categories,
}: {
  categories: Array<Category & { product_count?: number }>;
}) {
  return (
    <section className="mx-auto mt-10 w-full max-w-[1240px] px-4">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-bold text-ink md:text-2xl">Категории</h2>
        <Link href="/catalog" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
          Весь каталог <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/catalog/${cat.slug}`}
            className="group flex h-full flex-col justify-between rounded-2xl bg-white p-4 ring-1 ring-line transition-all hover:-translate-y-0.5 hover:ring-brand-border"
          >
            <span
              className="grid h-11 w-11 place-items-center rounded-xl text-[20px] transition-transform group-hover:scale-105"
              style={{ background: cat.color ?? "#F0F0FF" }}
              aria-hidden
            >
              {cat.emoji}
            </span>
            <span className="mt-3 block text-[14px] font-bold leading-snug text-ink">
              {cat.name}
            </span>
            <span className="mt-1 block text-[12px] leading-snug text-muted">
              {TILES[cat.slug] ?? "Товары для жизни"}
            </span>
            <span className="mt-2 text-[12px] font-semibold text-brand">
              {cat.product_count ?? 0} товаров
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
