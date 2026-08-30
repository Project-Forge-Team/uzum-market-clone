import { requireUser } from "@/lib/server/auth";
import { replyToReview } from "@/lib/server/actions";
import { fail, json, readJson } from "@/lib/server/http";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await readJson<{ reply: string }>(request);
    replyToReview(user.id, Number(id), body.reply);
    return json({ detail: "Ответ опубликован" });
  } catch (err) {
    return fail(err);
  }
}
