import ProfileOverview from "@/components/profile/ProfileOverview";
import {
  getCurrentUser,
  getMyShop,
  listOrders,
  myReviews,
} from "@/lib/server/data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout уже редиректит на /login

  const [orders, reviews, shop] = await Promise.all([
    listOrders(),
    myReviews(),
    getMyShop(),
  ]);

  return (
    <ProfileOverview
      user={user}
      orders={orders}
      reviews={reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        text: review.text,
        product: review.product,
      }))}
      shop={shop ? { id: shop.id, name: shop.name, slug: shop.slug } : null}
    />
  );
}
