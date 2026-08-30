import { listProducts, type ProductQuery } from "@/lib/server/catalog";
import { assertCsrf, getCurrentUser, requireUser } from "@/lib/server/auth";
import { createProduct } from "@/lib/server/actions";
import { fail, json, productQueryFromUrl, readJson } from "@/lib/server/http";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const query: ProductQuery = productQueryFromUrl(new URL(request.url));
    query.viewerId = user?.id ?? null;
    return json(listProducts(query));
  } catch (err) {
    return fail(err);
  }
}

/** Публикация товара продавцом. */
export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireUser();
    const body = await readJson<Record<string, unknown>>(request);
    const id = createProduct(user.id, body as never);
    return json({ id, detail: "Товар опубликован" }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}
