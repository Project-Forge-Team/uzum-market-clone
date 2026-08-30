import { assertCsrf, requireUser } from "@/lib/server/auth";
import { advanceOrder } from "@/lib/server/actions";
import { fail, json, readJson } from "@/lib/server/http";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await readJson<{ action?: "advance" | "cancel" }>(request);
    const status = advanceOrder(user.id, Number(id), body.action ?? "advance");
    return json({ status, detail: "Статус заказа обновлён" });
  } catch (err) {
    return fail(err);
  }
}
