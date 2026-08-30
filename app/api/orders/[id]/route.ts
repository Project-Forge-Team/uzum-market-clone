import { getCurrentUser } from "@/lib/server/auth";
import { getOrderForUser } from "@/lib/server/catalog";
import { fail, json } from "@/lib/server/http";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ detail: "Нужно войти в аккаунт" }, { status: 401 });
    const { id } = await ctx.params;
    const order = getOrderForUser(Number(id), user.id);
    if (!order) return json({ detail: "Заказ не найден" }, { status: 404 });
    return json(order);
  } catch (err) {
    return fail(err);
  }
}
