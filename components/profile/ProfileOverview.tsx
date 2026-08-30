"use client";

import Link from "next/link";
import {
  CalendarDays,
  Heart,
  Mail,
  MessageSquareQuote,
  Package,
  Phone,
  ShoppingCart,
  Store,
} from "lucide-react";
import LogoutButton from "@/components/ui/LogoutButton";
import { formatDate, formatNumber } from "@/lib/format";
import { useCart } from "@/lib/cart";
import type { ShopOrder, UserProfile } from "@/types/product";

export default function ProfileOverview({
  user,
  orders,
  reviews,
  shop,
}: {
  user: UserProfile;
  orders: ShopOrder[];
  reviews: Array<{ id: number; rating: number; text: string; product: { id: number; title: string; image: string } }>;
  shop: { id: number; name: string; slug: string } | null;
}) {
  const { favorites, items } = useCart();
  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));

  const tiles = [
    {
      icon: Package,
      label: "Заказы",
      value: String(orders.length),
      hint: active.length ? `${active.length} в пути` : "нет активных",
      href: "/profile/orders",
    },
    {
      icon: Heart,
      label: "Избранное",
      value: String(favorites.length),
      hint: "локально, без аккаунта",
      href: "/profile/favorites",
    },
    {
      icon: ShoppingCart,
      label: "Корзина",
      value: String(items.reduce((acc, line) => acc + line.qty, 0)),
      hint: "штук сейчас",
      href: "/cart",
    },
    {
      icon: MessageSquareQuote,
      label: "Отзывы",
      value: String(reviews.length),
      hint: "оставлено покупок",
      href: "/profile/reviews",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-5 ring-1 ring-line md:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-soft text-[20px] font-extrabold uppercase text-brand">
            {((user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")) ||
              user.email.slice(0, 2)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-ink">
              {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.email}
            </h2>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <Mail size={14} className="text-gray-400" /> {user.email}
              </span>
              {user.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={14} className="text-gray-400" /> {user.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} className="text-gray-400" /> с нами с{" "}
                {formatDate(user.date_joined)}
              </span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="rounded-2xl bg-white p-4 ring-1 ring-line transition-all hover:-translate-y-0.5 hover:ring-brand-border"
          >
            <tile.icon size={18} className="text-brand" />
            <p className="mt-2.5 text-2xl font-extrabold leading-none text-ink">{tile.value}</p>
            <p className="mt-1.5 text-[13px] font-semibold text-gray-700">{tile.label}</p>
            <p className="text-[11.5px] text-muted">{tile.hint}</p>
          </Link>
        ))}
      </div>

      {shop && (
        <Link
          href="/cabinet"
          className="flex items-center gap-3 rounded-2xl bg-ink p-5 text-white transition-colors hover:bg-brand"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
            <Store size={18} className="text-accent" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold">Магазин «{shop.name}»</span>
            <span className="block text-[12.5px] text-white/60">
              Кабинет продавца: товары, заказы и ответы на отзывы
            </span>
          </span>
          <span className="rounded-lg bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold">
            Открыть →
          </span>
        </Link>
      )}

      <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
        <h3 className="text-[15px] font-bold text-ink">Последние заказы</h3>
        {orders.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-muted">
            Заказов пока нет.{" "}
            <Link href="/catalog" className="font-semibold text-brand hover:underline">
              Перейти в каталог
            </Link>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {orders.slice(0, 3).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/profile/orders/${order.id}`}
                  className="flex items-center gap-3 py-3 transition-colors hover:text-brand"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-bold text-ink">
                      {order.number} · {order.items.length} поз.
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {order.items.map((i) => i.title).join(", ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13.5px] font-bold text-ink">
                      {formatNumber(order.total)} сум
                    </span>
                    <span className="block text-[12px] text-muted">
                      от {formatDate(order.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {reviews.length > 0 && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <h3 className="text-[15px] font-bold text-ink">Ваши отзывы</h3>
          <ul className="mt-3 space-y-3">
            {reviews.slice(0, 2).map((review) => (
              <li key={review.id} className="flex gap-3">
                <Link
                  href={`/product/${review.product.id}`}
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={review.product.image}
                    alt={review.product.title}
                    className="h-full w-full object-contain"
                  />
                </Link>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {review.product.title}
                  </p>
                  <p className="line-clamp-2 text-[12.5px] text-muted">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)} · {review.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
