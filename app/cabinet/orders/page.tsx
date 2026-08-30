import SellerOrders from "@/components/seller/SellerOrders";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { sellerOrders } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Заказы магазина" };

export default async function CabinetOrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const shop = user.seller_id ? getDb().sellers.find((s) => s.id === user.seller_id) : null;
  const orders = shop ? sellerOrders(shop.id) : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-ink">
          Заказы магазина{" "}
          <span className="font-medium text-muted">({orders.length})</span>
        </h2>
        <p className="mt-0.5 text-[13px] text-muted">
          В демо-режиме заказы создаются без платежей, но ведутся по-настоящему:
          статусы, история и списание остатков.
        </p>
      </div>
      <SellerOrders initial={orders} />
    </div>
  );
}
