import Link from "next/link";
import { PackageSearch } from "lucide-react";

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface text-gray-500">
        <PackageSearch size={26} />
      </span>
      <h1 className="mt-4 text-xl font-bold text-ink">Товар не найден</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Карточка удалена продавцом, снята с продажи или ссылки никогда не было.
        Попробуйте поиск по названию — похожие товары точно есть.
      </p>
      <div className="mt-6 flex gap-2.5">
        <Link
          href="/search"
          className="rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Искать товары
        </Link>
        <Link
          href="/catalog"
          className="rounded-xl px-5 py-3 text-sm font-bold text-brand ring-1 ring-brand-border transition-colors hover:bg-brand-soft"
        >
          Каталог
        </Link>
      </div>
    </div>
  );
}
