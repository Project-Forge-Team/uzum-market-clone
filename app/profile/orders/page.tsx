import Link from "next/link";
import { Package, ShoppingBag } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import OrderCard from "@/components/profile/OrderCard";
import { getCurrentUser, listOrders } from "@/lib/api-server";
import { productsWord } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Мои заказы" };

export default async function MyOrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const orders = await listOrders(user.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">
          Мои заказы <span className="font-medium text-muted">({orders.length})</span>
        </h2>
        <Link
          href="/catalog"
          className="text-[13px] font-semibold text-brand hover:underline"
        >
          Сделать новый заказ
        </Link>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Здесь пока нет заказов"
          text="Оформите что-нибудь из каталога — заказ появится в этом списке со статусом и историей изменений."
          actionHref="/catalog"
          actionLabel="В каталог"
        />
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} detailed />
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-2 rounded-xl bg-surface/70 px-4 py-3 text-[12.5px] text-muted">
        <ShoppingBag size={15} className="text-brand" />
        Статусы меняются «по-настоящему»: продавец может перевести заказ из «нового» в
        «собирается» и «в пути», а вы — отменить его до отгрузки.{" "}
        {productsWord(orders.reduce((acc, o) => acc + o.items_count, 0))} всего.
      </p>
    </div>
  );
}
