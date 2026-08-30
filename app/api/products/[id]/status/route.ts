import { requireUser } from "@/lib/server/auth";
import { setProductStatus } from "@/lib/server/actions";
import { fail, json, readJson } from "@/lib/server/http";
import type { ProductRow } from "@/lib/server/db";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await readJson<{ status: ProductRow["status"] }>(request);
    setProductStatus(user.id, Number(id), body.status);
    return json({ detail: "Статус обновлён" });
  } catch (err) {
    return fail(err);
  }
}
