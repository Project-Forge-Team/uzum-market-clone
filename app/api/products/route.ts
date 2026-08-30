import { listProducts, type ProductQuery } from "@/lib/server/catalog";
import { assertCsrf, getCurrentUser, requireUser } from "@/lib/server/auth";
import { createProduct } from "@/lib/server/actions";
import { getDb } from "@/lib/server/db";
import { fail, json, productQueryFromUrl, readJson } from "@/lib/server/http";

const EMPTY_LIST = {
  count: 0,
  page: 1,
  page_size: 0,
  total_pages: 1,
  next: false,
  previous: false,
  results: [],
};

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const query: ProductQuery = productQueryFromUrl(new URL(request.url));
    query.viewerId = user?.id ?? null;

    // Черновик и архив — внутренняя кухня продавца. Без этой проверки любой
    // мог бы посмотреть ?status=draft и увидеть товары, которые ещё не
    // опубликованы (цены, названия, остатки чужих магазинов).
    if (query.status && query.status !== "active") {
      const shop = user ? getDb().sellers.find((s) => s.owner_id === user.id) : null;
      if (!shop) return json(EMPTY_LIST);
      query.seller = String(shop.id);
    }
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
