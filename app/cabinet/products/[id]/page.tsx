import { notFound } from "next/navigation";
import ProductForm from "@/components/seller/ProductForm";
import {
  getCurrentUser,
  getMyShop,
  getProduct,
  listCategories,
} from "@/lib/server/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Редактирование товара" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null; // layout уже редиректит на /login

  const [shop, product, categories] = await Promise.all([
    getMyShop(),
    getProduct(id),
    listCategories(),
  ]);
  if (!shop) notFound();

  // Чужой товар в редакторе показывать нельзя: свой черновик бэкенд отдаёт
  // владельцу, но чужой активный товар доступен всем — проверяем магазин.
  if (!product || product.seller?.id !== shop.id) notFound();

  return (
    <ProductForm
      categories={categories}
      product={product}
      shopName={shop.name}
      shopId={shop.id}
    />
  );
}
