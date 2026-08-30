import SellerReviews from "@/components/seller/SellerReviews";
import { getCurrentUser, getMyShop, sellerReviews } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Отзывы о товарах" };

export default async function CabinetReviewsPage() {
  const [user, shop] = await Promise.all([getCurrentUser(), getMyShop()]);
  if (!user) return null;
  const rows = shop ? await sellerReviews(shop.id) : [];

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
