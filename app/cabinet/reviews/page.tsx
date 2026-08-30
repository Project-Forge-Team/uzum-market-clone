import SellerReviews from "@/components/seller/SellerReviews";
import { getCurrentUser, sellerReviews } from "@/lib/server/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Отзывы о товарах" };

export default async function CabinetReviewsPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout уже редиректит на /login
  const rows = await sellerReviews();

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
