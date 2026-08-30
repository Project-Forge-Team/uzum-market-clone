import { getProductByIdOrSlug } from "@/lib/server/catalog";
import { assertCsrf, getCurrentUser, requireUser } from "@/lib/server/auth";
import { deleteProduct, updateProduct } from "@/lib/server/actions";
import { fail, json, readJson } from "@/lib/server/http";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const user = await getCurrentUser();
    // Скрытые статусы отдаём только владельцу (проверка внутри каталога),
    // покупатель на черновик получает 404.
    const product = getProductByIdOrSlug(id, user?.id ?? null);
    if (!product) return json({ detail: "Товар не найден" }, { status: 404 });
    return json(product);
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await readJson<Record<string, unknown>>(request);
    const productId = updateProduct(user.id, Number(id), body as never);
    return json({ id: productId, detail: "Изменения сохранены" });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireUser();
    const { id } = await ctx.params;
    deleteProduct(user.id, Number(id));
    return json({ detail: "Товар удалён" });
  } catch (err) {
    return fail(err);
  }
}
