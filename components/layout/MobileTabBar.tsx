"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useSession } from "@/lib/session";

const TABS = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/cart", label: "Корзина", icon: ShoppingCart },
  { href: "/favorites", label: "Избранное", icon: Heart },
  { href: "/profile", label: "Профиль", icon: User },
];

/** Нижняя навигация как в мобильном приложении маркетплейса. */
export default function MobileTabBar() {
  const pathname = usePathname();
  const { count, favorites } = useCart();
  const { user } = useSession();

  const badgeFor = (href: string) =>
    href === "/cart" ? count : href === "/favorites" ? favorites.length : 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="flex items-stretch justify-between px-1">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const badge = badgeFor(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-brand" : "text-gray-500"
                }`}
              >
                <tab.icon size={20} className={active ? "text-brand" : ""} />
                {tab.label}
                {tab.href === "/profile" && !user && (
                  <span className="absolute right-3 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                )}
                {badge > 0 && (
                  <span className="absolute left-[calc(50%+6px)] top-1 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
