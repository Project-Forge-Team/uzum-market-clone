import { notFound } from "next/navigation";
import ProductForm from "@/components/seller/ProductForm";
import { getCurrentUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { getProductByIdOrSlug, listCategories } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Редактирование товара" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const shop = user.seller_id ? getDb().sellers.find((s) => s.id === user.seller_id) : null;
  if (!shop) notFound();

  const product = getProductByIdOrSlug(id, user.id, { includeHidden: true });
  // Чужой товар показывать в редакторе нельзя — отдаём 404, как настоящий API.
  if (!product || product.seller?.id !== shop.id) notFound();

  return (
    <ProductForm
      categories={listCategories()}
      product={product}
      shopName={shop.name}
      shopId={shop.id}
    />
  );
}
