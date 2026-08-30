import { addView } from "@/lib/server/actions";
import { fail, json } from "@/lib/server/http";

/** Счётчик просмотров: пингуется с карточки товара один раз за показ. */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    addView(Number(id));
    return json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
