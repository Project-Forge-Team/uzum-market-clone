import ProfileOverview from "@/components/profile/ProfileOverview";
import { getCurrentUser, publicUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { listOrders, myReviews } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userRow = await getCurrentUser();
  if (!userRow) return null; // layout уже редиректит на /login
  const user = publicUser(userRow);
  const db = getDb();
  const shop = user.seller_id
    ? db.sellers.find((s) => s.id === user.seller_id) ?? null
    : null;

  return (
    <ProfileOverview
      user={user}
      orders={listOrders(user.id)}
      reviews={myReviews(user.id).map((review) => ({
        id: review.id,
        rating: review.rating,
        text: review.text,
        product: {
          id: review.product.id,
          title: review.product.title,
          image: review.product.image,
        },
      }))}
      shop={shop ? { id: shop.id, name: shop.name, slug: shop.slug } : null}
    />
  );
}
