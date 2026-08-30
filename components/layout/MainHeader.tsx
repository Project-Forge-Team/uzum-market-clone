"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Menu, ShoppingCart, Store, User, X } from "lucide-react";
import SearchBox from "@/components/layout/SearchBox";
import UserMenu from "@/components/layout/UserMenu";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";
import type { Category } from "@/types/product";

function IconButton({
  href,
  label,
  icon,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-gray-700 transition-colors hover:text-brand"
    >
      <span className="relative">
        {icon}
        {!!badge && badge > 0 && (
          <span className="absolute -right-2 -top-2 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="hidden text-[14px] font-medium lg:inline">{label}</span>
    </Link>
  );
}

export default function MainHeader({
  categories = [],
}: {
  categories?: Array<Category & { product_count?: number }>;
}) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const { user } = useSession();
  const { count, favorites } = useCart();

  useEffect(() => {
    document.body.style.overflow = catalogOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [catalogOpen]);

  const displayName = user?.first_name || user?.email?.split("@")[0] || null;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-center gap-3 px-4 py-3 md:flex-row md:gap-5 md:py-4">
          <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-start">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/headLogo.png"
                alt="Uzum Market"
                className="h-[22px] w-auto sm:h-[26px]"
              />
            </Link>

            <div className="flex items-center gap-1 md:hidden">
              <IconButton
                href="/favorites"
                label="Избранное"
                icon={<Heart size={22} />}
                badge={favorites.length}
              />
              <IconButton
                href="/cart"
                label="Корзина"
                icon={<ShoppingCart size={22} />}
                badge={count}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCatalogOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-soft px-4 py-2.5 text-[14px] font-medium text-brand transition-colors hover:bg-brand-border md:order-first"
          >
            <Menu size={20} />
            <span className="hidden sm:inline">Каталог</span>
          </button>

          <SearchBox className="w-full md:max-w-[560px]" />

          <div className="hidden items-center gap-4 md:flex lg:gap-5">
            <IconButton
              href="/favorites"
              label="Избранное"
              icon={<Heart size={22} />}
              badge={favorites.length}
            />
            <IconButton
              href="/cart"
              label="Корзина"
              icon={<ShoppingCart size={22} />}
              badge={count}
            />
            {user ? (
              <UserMenu user={user} displayName={displayName ?? "Профиль"} />
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-gray-700 transition-colors hover:text-brand"
              >
                <User size={22} />
                <span className="text-[14px] font-medium">Войти</span>
              </Link>
            )}
          </div>

          <Link
            href="/cabinet"
            className="hidden items-center gap-2 rounded-lg border border-dashed border-brand-border px-3 py-2 text-[13px] font-semibold text-brand transition-colors hover:bg-brand-soft xl:flex"
          >
            <Store size={16} /> Кабинет продавца
          </Link>
        </div>
      </header>

      {catalogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-start bg-black/40 backdrop-blur-[2px]"
          onClick={() => setCatalogOpen(false)}
        >
          <div
            className="h-full w-full max-w-[1000px] overflow-y-auto bg-white p-5 shadow-2xl md:ml-[max(0px,calc(50vw-620px))] md:mt-[92px] md:h-auto md:rounded-3xl md:p-7"
            onClick={(event) => {
              event.stopPropagation();
              // Клик по ссылке внутри панели ведёт на другую страницу — меню
              // закрываем здесь, а не «подхватом» смены pathname.
              if ((event.target as HTMLElement).closest("a"))
                setCatalogOpen(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Каталог товаров"
          >
            <div className="mb-5 flex items-center justify-between border-b border-line pb-3 md:border-none md:pb-0">
              <h2 className="text-xl font-bold text-ink">Каталог</h2>
              <button
                type="button"
                onClick={() => setCatalogOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface"
                aria-label="Закрыть каталог"
              >
                <X size={20} />
              </button>
            </div>

            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/catalog/${cat.slug}`}
                    className="flex items-center gap-3 rounded-xl bg-surface/70 p-3 transition-colors hover:bg-brand-soft"
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
                      style={{ background: cat.color ?? "#F0F0FF" }}
                      aria-hidden
                    >
                      {cat.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">
                        {cat.name}
                      </span>
                      <span className="block text-[12px] text-muted">
                        {cat.product_count ?? 0} товаров
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-5 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
              <Link
                href="/catalog"
                className="rounded-xl bg-brand px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                Весь каталог с фильтрами
              </Link>
              <Link
                href="/sellers"
                className="rounded-xl px-4 py-3 text-center text-sm font-semibold text-brand ring-1 ring-brand-border transition-colors hover:bg-brand-soft"
              >
                Магазины маркетплейса
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
