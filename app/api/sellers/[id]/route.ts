import { getSellerBySlugOrId } from "@/lib/server/catalog";
import { fail, json } from "@/lib/server/http";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const seller = getSellerBySlugOrId(id);
    if (!seller) return json({ detail: "Магазин не найден" }, { status: 404 });
    return json(seller);
  } catch (err) {
    return fail(err);
  }
}
