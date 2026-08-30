import Link from "next/link";
import { Store } from "lucide-react";
import SectionHeader from "@/components/ui/SectionHeader";
import ShopsList from "@/components/shop/ShopsList";
import { listSellers } from "@/lib/server/data";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Магазины",
  description: "Продавцы учебного маркетплейса: рейтинг, число товаров и страница магазина.",
};

export default async function SellersPage() {
  const sellers = await listSellers();

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6">
      <SectionHeader
        title="Магазины Uzum Market"
        subtitle="У каждого продавца своя витрина, рейтинг и ответы на отзывы"
        href="/sell"
        linkLabel="Открыть свой магазин"
      />
      <ShopsList sellers={sellers} />

      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl bg-brand-soft p-5">
        <Store size={20} className="text-brand" />
        <p className="text-[14px] font-medium text-ink">
          Хотите свой магазин? Регистрация покупателя уже создаёт вам магазин — можно
          сразу выкладывать товары.
        </p>
        <Link
          href="/cabinet/products/new"
          className="ml-auto rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Добавить товар
        </Link>
      </div>
    </div>
  );
}
