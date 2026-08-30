import type { Metadata } from "next";
import "./globals.css";
import TopBar from "@/components/layout/TopBar";
import MainHeader from "@/components/layout/MainHeader";
import Footer from "@/components/layout/Footer";
import MobileTabBar from "@/components/layout/MobileTabBar";
import DemoNotice from "@/components/layout/DemoNotice";
import { CartProvider } from "@/lib/cart";
import { SessionProvider } from "@/lib/session";
import { getCurrentUser, listCategories, publicUser } from "@/lib/api-server";

export const metadata: Metadata = {
  title: {
    default: "Uzum Market Clone — учебный маркетплейс",
    template: "%s · Uzum Market Clone",
  },
  description:
    "Учебный клон маркетплейса: каталог товаров, корзина, заказы, отзывы покупателей и личный кабинет продавца. Данные локальные, оплата отключена.",
};

// Данные приходят с бэкенда (BACKEND_URL), поэтому страницы рендерим на каждый
// запрос: новый товар продавца сразу виден в каталоге, а личное (отзывы,
// «моя покупка») считается по куке сессии.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, categories] = await Promise.all([getCurrentUser(), listCategories()]);

  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col bg-white text-ink">
        <SessionProvider initialUser={user ? publicUser(user) : null}>
          <CartProvider>
            <DemoNotice />
            <TopBar />
            <MainHeader categories={categories} />
            <main className="flex-1 pb-6">{children}</main>
            <Footer />
            <MobileTabBar />
          </CartProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
