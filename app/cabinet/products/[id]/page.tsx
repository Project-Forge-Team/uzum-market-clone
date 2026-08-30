import { notFound } from "next/navigation";
import ProductForm from "@/components/seller/ProductForm";
import { getProductByIdOrSlug, getCurrentUser, getMyShop, listCategories } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Редактирование товара" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, shop, categories] = await Promise.all([
    getCurrentUser(),
    getMyShop(),
    listCategories(),
  ]);
  if (!user) return null;
  if (!shop) notFound();

  const product = await getProductByIdOrSlug(id, user.id, { includeHidden: true });
  // Чужой товар показывать в редакторе нельзя — отдаём 404, как настоящий API.
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
