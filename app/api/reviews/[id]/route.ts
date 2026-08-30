import { requireUser } from "@/lib/server/auth";
import { deleteReview } from "@/lib/server/actions";
import { fail, json } from "@/lib/server/http";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    deleteReview(user.id, Number(id));
    return json({ detail: "Отзыв удалён" });
  } catch (err) {
    return fail(err);
  }
}
