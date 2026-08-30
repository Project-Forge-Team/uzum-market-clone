import { fail, json } from "@/lib/server/http";
import { issueCsrfCookie } from "@/lib/server/auth";

/** Выдаём CSRF-куку (double-submit), как это делает реальный бэкенд на Django. */
export async function GET() {
  try {
    const token = await issueCsrfCookie();
    return json({ detail: "CSRF cookie issued", csrf: token });
  } catch (err) {
    return fail(err);
  }
}
