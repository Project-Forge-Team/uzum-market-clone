import ProductForm from "@/components/seller/ProductForm";
import { getCurrentUser, getMyShop, listCategories } from "@/lib/server/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Новый товар" };

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout уже редиректит на /login
  const [categories, shop] = await Promise.all([listCategories(), getMyShop()]);

  return (
    <ProductForm
      categories={categories}
      shopName={shop?.name ?? null}
      shopId={shop?.id ?? null}
    />
  );
}
