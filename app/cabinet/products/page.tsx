import ProductManager from "@/components/seller/ProductManager";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { sellerProducts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Мои товары" };

export default async function CabinetProductsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const shop = user.seller_id ? getDb().sellers.find((s) => s.id === user.seller_id) : null;
  const products = shop ? sellerProducts(shop.id) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">
          Мои товары <span className="font-medium text-muted">({products.length})</span>
        </h2>
        <p className="text-[13px] text-muted">
          Статус, остаток и цена меняются прямо здесь — карточка обновляется мгновенно.
        </p>
      </div>
      <ProductManager initial={products} />
    </div>
  );
}
