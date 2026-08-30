import ShopSettings from "@/components/seller/ShopSettings";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { getSellerBySlugOrId, sellerStats } from "@/lib/server/catalog";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Настройки магазина" };

export default async function CabinetShopPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const shopRow = user.seller_id ? getDb().sellers.find((s) => s.id === user.seller_id) : null;
  const shop = shopRow ? getSellerBySlugOrId(shopRow.slug) : null;
  const stats = shopRow ? sellerStats(shopRow.id) : null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-ink">Магазин</h2>
      <ShopSettings
        shop={
          shop
            ? { name: shop.name, city: shop.city, description: shop.description, slug: shop.slug }
            : null
        }
      />

      {shop && stats && (
        <section className="grid gap-3 sm:grid-cols-3">
          <Metric label="Просмотры карточек" value={formatNumber(stats.views)} />
          <Metric label="Средний рейтинг" value={stats.rating ? stats.rating.toFixed(1) : "—"} />
          <Metric label="Единиц на складе" value={formatNumber(stats.stock_units)} />
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
      <p className="text-[12px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1.5 text-xl font-extrabold text-ink">{value}</p>
    </div>
  );
}
