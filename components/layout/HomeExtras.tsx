import Link from "next/link";
import {
  Banknote,
  ShieldCheck,
  Store,
  ThumbsUp,
  TrendingUp,
  Truck,
  Package,
  Star,
} from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { Seller } from "@/types/product";

/** Гарантии сервиса — короткий блок под каталогом. */
export function TrustStrip() {
  const items = [
    {
      icon: Truck,
      title: "Доставка за 1 день",
      text: "По Ташкенту — бесплатно от 500 000 сум",
    },
    {
      icon: Banknote,
      title: "Оплата при получении",
      text: "Картой, наличными или в рассрочку",
    },
    {
      icon: ShieldCheck,
      title: "Возврат 14 дней",
      text: "Без объяснения причин, если товар новый",
    },
    {
      icon: ThumbsUp,
      title: "Только реальные отзывы",
      text: "Отзыв можно оставить после заказа",
    },
  ];

  return (
    <section className="mx-auto mt-12 w-full max-w-[1240px] px-4">
      <div className="grid gap-3 rounded-2xl bg-surface/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand">
              <item.icon size={17} />
            </span>
            <div>
              <p className="text-[14px] font-semibold text-ink">{item.title}</p>
              <p className="text-[12.5px] leading-snug text-muted">
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Блок «продавцам» — вход в кабинет и цифры маркетплейса. */
export function SellerPromo({
  stats,
}: {
  stats: {
    products: number;
    categories: number;
    sellers: number;
    reviews: number;
  };
}) {
  return (
    <section className="mx-auto mt-12 w-full max-w-[1240px] px-4">
      <div className="grid items-center gap-6 overflow-hidden rounded-3xl bg-ink p-6 text-white md:grid-cols-2 md:p-9">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-accent">
            Для продавцов
          </p>
          <h2 className="mt-3 text-2xl font-bold leading-tight md:text-[30px]">
            Выложите свой товар — и получите заказы уже завтра
          </h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/70">
            Добавляйте товары с фото и характеристиками, управляйте заказами и
            отвечайте на отзывы.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link
              href="/cabinet/products/new"
              className="rounded-xl bg-accent px-5 py-3 text-[14px] font-bold text-ink transition-colors hover:bg-white"
            >
              Добавить товар
            </Link>
            <Link
              href="/sell"
              className="rounded-xl px-5 py-3 text-[14px] font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
            >
              Как это работает
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              icon: Package,
              label: "товаров в каталоге",
              value: formatNumber(stats.products),
            },
            { icon: Store, label: "магазинов", value: String(stats.sellers) },
            {
              icon: Star,
              label: "отзывов покупателей",
              value: formatNumber(stats.reviews),
            },
            {
              icon: TrendingUp,
              label: "категорий",
              value: String(stats.categories),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"
            >
              <stat.icon size={18} className="text-accent" />
              <p className="mt-2.5 text-2xl font-bold leading-none">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[12.5px] text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Магазины недели. */
export function ShopsRow({
  sellers = [],
}: {
  sellers: Array<Seller & { product_count: number }>;
}) {
  if (!sellers.length) return null;
  return (
    <section className="mx-auto mt-12 w-full max-w-[1240px] px-4">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-bold text-ink md:text-2xl">Магазины</h2>
        <Link
          href="/sellers"
          className="text-[13px] font-semibold text-brand hover:underline"
        >
          Все магазины
        </Link>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {sellers.map((seller) => (
          <Link
            key={seller.id}
            href={`/shop/${seller.slug}`}
            className="flex w-[268px] shrink-0 items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line transition-all hover:-translate-y-0.5 hover:ring-brand-border"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-[15px] font-bold text-brand">
              {seller.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-bold text-ink">
                {seller.name}
              </span>
              <span className="block text-[12px] text-muted">
                {seller.rating > 0
                  ? `${seller.rating.toFixed(1)} ★`
                  : "новых отзывов пока нет"}{" "}
                · {seller.product_count} товаров
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
