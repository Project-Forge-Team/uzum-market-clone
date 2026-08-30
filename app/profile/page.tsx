import ProfileOverview from "@/components/profile/ProfileOverview";
import { getCurrentUser, getMyShop, listOrders, myReviews, publicUser } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userRow = await getCurrentUser();
  if (!userRow) return null; // layout уже редиректит на /login
  const user = publicUser(userRow);

  const [shop, orders, reviews] = await Promise.all([
    getMyShop(),
    listOrders(user.id),
    myReviews(user.id),
  ]);

  return (
    <ProfileOverview
      user={user}
      orders={orders}
      reviews={reviews.map((review) => ({
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
