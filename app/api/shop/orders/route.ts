import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { sellerOrders, sellerStats } from "@/lib/server/catalog";
import { fail, json } from "@/lib/server/http";

/** Заказы, в которых есть товары моего магазина (для кабинета продавца). */
export async function GET() {
  try {
    const user = await requireUser();
    const seller = getDb().sellers.find((s) => s.owner_id === user.id);
    if (!seller) return json({ count: 0, results: [], stats: null });
    const results = sellerOrders(seller.id);
    return json({ count: results.length, results, stats: sellerStats(seller.id) });
  } catch (err) {
    return fail(err);
  }
}
