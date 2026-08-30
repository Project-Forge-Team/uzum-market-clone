import SellerOrders from "@/components/seller/SellerOrders";
import { getCurrentUser, getMyShop, sellerOrders } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Заказы магазина" };

export default async function CabinetOrdersPage() {
  const [user, shop] = await Promise.all([getCurrentUser(), getMyShop()]);
  if (!user) return null;
  const orders = shop ? await sellerOrders(shop.id) : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-ink">
          Заказы магазина{" "}
          <span className="font-medium text-muted">({orders.length})</span>
        </h2>
        <p className="mt-0.5 text-[13px] text-muted">
          Заказы ведутся с полной историей статусов и списанием остатков.
        </p>
      </div>
      <SellerOrders initial={orders} />
    </div>
  );
}
