import {
  clearSessionCookie,
  destroySession,
  readSessionToken,
} from "@/lib/server/auth";
import { fail, json } from "@/lib/server/http";

export async function POST() {
  try {
    destroySession(await readSessionToken());
    await clearSessionCookie();
    return json({ detail: "Вы вышли из аккаунта" });
  } catch (err) {
    return fail(err);
  }
}
