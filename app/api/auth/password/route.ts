import { assertCsrf, requireUser } from "@/lib/server/auth";
import { changePassword } from "@/lib/server/actions";
import { fail, json, readJson } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const user = await requireUser();
    const body = await readJson<{ current: string; next: string }>(request);
    changePassword(user.id, body.current, body.next);
    return json({ detail: "Пароль обновлён" });
  } catch (err) {
    return fail(err);
  }
}
