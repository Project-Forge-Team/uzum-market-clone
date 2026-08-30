import ProductForm from "@/components/seller/ProductForm";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { listCategories } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Новый товар" };

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const shop = user.seller_id ? getDb().sellers.find((s) => s.id === user.seller_id) : null;

  return <ProductForm categories={listCategories()} shopName={shop?.name ?? null} shopId={shop?.id ?? null} />;
}
