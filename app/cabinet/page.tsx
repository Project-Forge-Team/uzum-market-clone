import Link from "next/link";
import {
  Eye,
  ListChecks,
  MessageSquareQuote,
  Package,
  PlusCircle,
  Percent,
  Star,
  Store,
  TrendingUp,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import ProductCard from "@/components/ui/ProductCard";
import {
  getCurrentUser,
  getMyShop,
  sellerOrders,
  sellerProducts,
  sellerStats,
} from "@/lib/api-server";
import { formatNumber, productsWord } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/types/product";

export const dynamic = "force-dynamic";

/** Сводка продавца: метрики, последние товары и заказы. */
export default async function CabinetOverviewPage() {
  const [userRow, shop] = await Promise.all([getCurrentUser(), getMyShop()]);
  if (!userRow) return null;

  if (!shop) {
    return (
      <EmptyState
        icon={Store}
        title="Начните с названия магазина"
        text="Магазин — это витрина: название, город и описание. Без него некуда выложить товары, поэтому создаём его первым."
        actionHref="/cabinet/products/new"
        actionLabel="Создать магазин и первый товар"
        secondaryHref="/sell"
        secondaryLabel="Прочитать, как это работает"
      />
    );
  }

  const [stats, products, orders] = await Promise.all([
    sellerStats(shop.id),
    sellerProducts(shop.id),
    sellerOrders(shop.id),
  ]);
  const activeProducts = products.filter((p) => p.status === "active");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={ListChecks}
          label="Товаров в продаже"
          value={stats.product_count}
          hint={
            stats.draft_count
              ? `${stats.draft_count} черновиков`
              : "черновиков нет"
          }
        />
        <StatCard
          icon={Star}
          label="Средний рейтинг"
          value={
            stats.rating > 0 ? stats.rating.toFixed(1).replace(".", ",") : "—"
          }
          hint={`${stats.review_count} отзывов`}
          tone="accent"
        />
        <StatCard
          icon={Package}
          label="Заказы"
          value={stats.order_count}
          hint={productsWord(orders.reduce((acc, o) => acc + o.items_count, 0))}
          tone="neutral"
        />
        <StatCard
          icon={TrendingUp}
          label="Выручка"
          value={`${formatNumber(stats.revenue)} сум`}
          hint="сумма всех заказов"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-ink">Последние товары</h2>
            <Link
              href="/cabinet/products"
              className="text-[13px] font-semibold text-brand hover:underline"
            >
              Все товары
            </Link>
          </div>
          {products.length === 0 ? (
            <p className="mt-3 rounded-xl bg-surface/70 p-4 text-[13.5px] text-muted">
              Товаров пока нет. Добавьте первый — он появится в каталоге, поиске
              и на странице магазина.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {products.slice(0, 4).map((product) => (
                <li key={product.id} className="flex items-center gap-3">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/product/${product.id}`}
                      className="block truncate text-[13.5px] font-semibold text-ink hover:text-brand"
                    >
                      {product.title}
                    </Link>
                    <span className="block text-[12px] text-muted">
                      {formatNumber(product.price)} сум · {product.stock} шт. ·
                      статус {product.status}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-muted">
                    <Eye size={13} /> {product.views}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/cabinet/products/new"
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-[13.5px] font-bold text-white transition-colors hover:bg-brand-dark"
          >
            <PlusCircle size={16} /> Добавить товар
          </Link>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-ink">Заказы магазина</h2>
            <Link
              href="/cabinet/orders"
              className="text-[13px] font-semibold text-brand hover:underline"
            >
              Все заказы
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="mt-3 rounded-xl bg-surface/70 p-4 text-[13.5px] text-muted">
              Заказов нет. Как только покупатель оформит корзину с вашим
              товаром, заказ появится здесь со статусами и составом.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {orders.slice(0, 4).map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold text-ink">
                      {order.number}
                    </span>
                    <span className="block truncate text-[12px] text-muted">
                      {order.items
                        .map((i) => `${i.title} × ${i.qty}`)
                        .join(", ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] font-bold text-ink">
                      {formatNumber(order.total)}
                    </span>
                    <span className="block text-[11.5px] font-semibold text-brand">
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
        <h2 className="text-[15px] font-bold text-ink">Витрина магазина</h2>
        <p className="mt-1 text-[13px] text-muted">
          {activeProducts.length} активных товаров ·{" "}
          {stats.views > 0
            ? `${formatNumber(stats.views)} просмотров карточек`
            : "просмотров пока нет"}
        </p>
        {activeProducts.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {activeProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 text-[13px] font-medium text-brand">
            <Percent size={15} /> Чтобы товар быстрее покупали: укажите цену до
            скидки, добавьте 3–4 фото и 4–6 характеристик.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/shop/${shop.slug}`}
            className="rounded-xl bg-surface px-4 py-2.5 text-[13px] font-bold text-ink transition-colors hover:bg-brand-soft hover:text-brand"
          >
            <Store size={14} className="mr-1 inline" /> Посмотреть магазин
            глазами покупателя
          </Link>
          <Link
            href="/cabinet/reviews"
            className="rounded-xl px-4 py-2.5 text-[13px] font-bold text-brand ring-1 ring-brand-border transition-colors hover:bg-brand-soft"
          >
            <MessageSquareQuote size={14} className="mr-1 inline" /> Ответить на
            отзывы
          </Link>
        </div>
      </section>
    </div>
  );
}
