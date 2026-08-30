import { listReviews } from "@/lib/server/catalog";
import { assertCsrf, getCurrentUser, requireUser } from "@/lib/server/auth";
import { upsertReview } from "@/lib/server/actions";
import { fail, json, readJson } from "@/lib/server/http";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const user = await getCurrentUser();
    return json(listReviews(Number(id), user?.id ?? null));
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await assertCsrf(request);
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await readJson<{
      rating: number;
      text: string;
      pros: string;
      cons: string;
    }>(request);
    const result = upsertReview(user.id, Number(id), body);
    return json(
      { ...result, detail: result.updated ? "Отзыв обновлён" : "Спасибо за отзыв!" },
      { status: result.updated ? 200 : 201 },
    );
  } catch (err) {
    return fail(err);
  }
}
