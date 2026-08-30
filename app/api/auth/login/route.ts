import {
  assertCsrf,
  createSession,
  issueCsrfCookie,
  loginUser,
  publicUser,
  setSessionCookie,
} from "@/lib/server/auth";
import { fail, json, readJson } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    await assertCsrf(request);
    const body = await readJson<{ email: string; password: string }>(request);
    const user = loginUser(body.email, body.password);
    await issueCsrfCookie();
    await setSessionCookie(createSession(user.id));
    return json(publicUser(user));
  } catch (err) {
    return fail(err);
  }
}
