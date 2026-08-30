import ProductManager from "@/components/seller/ProductManager";
import { getCurrentUser, getMyShop, sellerProducts } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Мои товары" };

export default async function CabinetProductsPage() {
  const [user, shop] = await Promise.all([getCurrentUser(), getMyShop()]);
  if (!user) return null;
  const products = shop ? await sellerProducts(shop.id) : [];

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
