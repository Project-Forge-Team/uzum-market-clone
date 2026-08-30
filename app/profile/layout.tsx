import Link from "next/link";
import { redirect } from "next/navigation";
import {
  GitBranch,
  Heart,
  MessageSquareQuote,
  Package,
  Settings,
  Store,
  UserRound,
} from "lucide-react";
import { getCurrentUser, publicUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Личный кабинет" };

const TABS = [
  { href: "/profile", label: "Обзор", icon: UserRound },
  { href: "/profile/orders", label: "Заказы", icon: Package },
  { href: "/profile/favorites", label: "Избранное", icon: Heart },
  { href: "/profile/reviews", label: "Мои отзывы", icon: MessageSquareQuote },
  { href: "/profile/settings", label: "Настройки", icon: Settings },
];

/**
 * Каркас личного кабинета покупателя. Пользователь берётся из cookie-сессии,
 * поэтому сервер сразу отдаёт корректное состояние без «мигания» авторизации.
 * Провайдеры сессии и корзины подключены в корневом layout.
 */
export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userRow = await getCurrentUser();
  if (!userRow) redirect("/login?redirect=/profile");
  const user = publicUser(userRow);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-ink md:text-[28px]">Личный кабинет</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          {user.email} · заказы, отзывы и настройки аккаунта
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="h-fit lg:sticky lg:top-24" aria-label="Разделы профиля">
          <ul className="no-scrollbar flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
            {TABS.map((tab) => (
              <li key={tab.href} className="shrink-0">
                <Link
                  href={tab.href}
                  className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 text-[13.5px] font-semibold text-gray-700 ring-1 ring-line transition-colors hover:text-brand hover:ring-brand-border"
                >
                  <tab.icon size={16} className="text-gray-500" />
                  {tab.label}
                </Link>
              </li>
            ))}
            <li className="shrink-0">
              {user.seller_id ? (
                <Link
                  href="/cabinet"
                  className="flex items-center gap-2.5 rounded-xl bg-ink px-3.5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand"
                >
                  <Store size={16} className="text-accent" />
                  Кабинет продавца
                </Link>
              ) : (
                <Link
                  href="/sell"
                  className="flex items-center gap-2.5 rounded-xl border border-dashed border-brand-border px-3.5 py-2.5 text-[13.5px] font-semibold text-brand transition-colors hover:bg-brand-soft"
                >
                  <GitBranch size={16} />
                  Открыть магазин
                </Link>
              )}
            </li>
          </ul>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
