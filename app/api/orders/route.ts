import { assertCsrf, requireUser } from "@/lib/server/auth";
import { calcOrderTotals, createOrder } from "@/lib/server/actions";
import { listOrders } from "@/lib/server/catalog";
import { fail, json, readJson, toNumber } from "@/lib/server/http";

export async function GET() {
  try {
    const user = await requireUser();
    const results = listOrders(user.id);
    return json({ count: results.length, results });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireUser();
    const body = await readJson<Record<string, unknown>>(request);
    const id = createOrder(user.id, body as never);
    return json({ id, detail: "Заказ оформлен" }, { status: 201 });
  } catch (err) {
    return fail(err);
  }
}

/** Предпросмотр суммы с промокодом и доставкой (без создания заказа). */
export async function PUT(request: Request) {
  try {
    const body = await readJson<{
      subtotal: number;
      delivery_method: "courier" | "pickup";
      promo_code: string;
    }>(request);
    const totals = calcOrderTotals(
      toNumber(body.subtotal, 0),
      body.delivery_method === "pickup" ? "pickup" : "courier",
      body.promo_code,
    );
    return json(totals);
  } catch (err) {
    return fail(err);
  }
}
