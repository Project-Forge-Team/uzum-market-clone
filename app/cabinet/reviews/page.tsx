import SellerReviews from "@/components/seller/SellerReviews";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { sellerReviews } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Отзывы о товарах" };

export default async function CabinetReviewsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const shop = user.seller_id ? getDb().sellers.find((s) => s.id === user.seller_id) : null;
  const rows = shop ? sellerReviews(shop.id) : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-ink">
          Отзывы о товарах <span className="font-medium text-muted">({rows.length})</span>
        </h2>
        <p className="mt-0.5 text-[13px] text-muted">
          Вежливый ответ на претензию — самый дешёвый способ поднять рейтинг магазина.
        </p>
      </div>
      <SellerReviews initial={rows} />
    </div>
  );
}
