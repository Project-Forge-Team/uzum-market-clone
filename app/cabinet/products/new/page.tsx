import ProductForm from "@/components/seller/ProductForm";
import { getCurrentUser, getMyShop, listCategories } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Новый товар" };

export default async function NewProductPage() {
  const [user, shop, categories] = await Promise.all([
    getCurrentUser(),
    getMyShop(),
    listCategories(),
  ]);
  if (!user) return null;

  return <ProductForm categories={categories} shopName={shop?.name ?? null} shopId={shop?.id ?? null} />;
}
