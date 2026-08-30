import MyReviews from "@/components/profile/MyReviews";
import { getCurrentUser } from "@/lib/server/auth";
import { myReviews } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Мои отзывы" };

export default async function MyReviewsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = myReviews(user.id).map((review) => ({
    ...review,
    product: {
      id: review.product.id,
      title: review.product.title,
      image: review.product.image,
    },
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-ink">
        Мои отзывы{" "}
        <span className="font-medium text-muted">({rows.length})</span>
      </h2>
      <MyReviews initial={rows} />
    </div>
  );
}
