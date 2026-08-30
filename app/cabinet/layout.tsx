import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChartColumn,
  ListChecks,
  MessageSquareQuote,
  Package,
  PlusCircle,
  Store,
} from "lucide-react";
import { getCurrentUser, getMyShop, publicUser } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Кабинет продавца",
  description:
    "Управление товарами, остатками, заказами покупателей и отзывами.",
};

const TABS = [
  { href: "/cabinet", label: "Обзор", icon: ChartColumn },
  { href: "/cabinet/products", label: "Мои товары", icon: ListChecks },
  { href: "/cabinet/products/new", label: "Добавить товар", icon: PlusCircle },
  { href: "/cabinet/orders", label: "Заказы", icon: Package },
  { href: "/cabinet/reviews", label: "Отзывы", icon: MessageSquareQuote },
  { href: "/cabinet/shop", label: "Магазин", icon: Store },
];

/** Каркас кабинета продавца: доступ только для входа, дальше — вкладки. */
export default async function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userRow, shop] = await Promise.all([getCurrentUser(), getMyShop()]);
  if (!userRow) redirect("/login?redirect=/cabinet");
  const user = publicUser(userRow);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-accent">
            Кабинет продавца
          </p>
          <h1 className="mt-1 truncate text-xl font-bold md:text-2xl">
            {shop ? shop.name : "Магазин ещё не создан"}
          </h1>
          <p className="mt-0.5 truncate text-[12.5px] text-white/60">
            {shop
              ? `${shop.city} · ${shop.verified ? "магазин проверен" : "новый магазин"} · ${user.email}`
              : `Создайте магазин, чтобы публиковать товары — профиль: ${user.email}`}
          </p>
        </div>
        {shop && (
          <Link
            href={`/shop/${shop.slug}`}
            className="rounded-xl bg-white/10 px-4 py-2.5 text-[13px] font-bold text-white ring-1 ring-white/15 transition-colors hover:bg-white/20"
          >
            Страница магазина
          </Link>
        )}
      </header>

      <nav className="mb-5 -mx-4 px-4" aria-label="Разделы кабинета">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-[13px] font-semibold text-gray-700 ring-1 ring-line transition-colors hover:text-brand hover:ring-brand-border"
              >
                <tab.icon size={15} className="text-gray-500" />
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </div>
  );
}
