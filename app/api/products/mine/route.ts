import { sellerProducts } from "@/lib/server/catalog";
import { requireUser } from "@/lib/server/auth";
import { fail, json } from "@/lib/server/http";
import { getDb } from "@/lib/server/db";

export async function GET() {
  try {
    const user = await requireUser();
    const seller = getDb().sellers.find((s) => s.owner_id === user.id);
    if (!seller) {
      return json({ detail: "У вас пока нет магазина", results: [] }, { status: 200 });
    }
    const results = sellerProducts(seller.id);
    return json({
      count: results.length,
      page: 1,
      page_size: results.length,
      total_pages: 1,
      next: false,
      previous: false,
      results,
    });
  } catch (err) {
    return fail(err);
  }
}
